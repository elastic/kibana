/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { RerankGraphNode } from '@kbn/workflows/graph';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

interface FieldMapping {
  path: string[];
  type: 'text_field' | 'filter_field' | 'date_field' | 'numeric_field';
  alias: string;
}

export interface RerankStep extends BaseStep {
  with: {
    api_query: string;
    user_question: string;
    data: any[] | string; // Can be array or Liquid template string
    data_mapping: FieldMapping[];
    language_code: string;
    recognized_entities?: string[];
    recency_biased: boolean;
    date_range_filter?: [string, string] | null;
    max_results?: number;
  };
}

export class RerankStepImpl extends BaseAtomicNodeImplementation<RerankStep> {
  // Recency boosting configuration
  private static readonly RECENCY_MAX_BOOST = 2.0; // Maximum boost multiplier for documents at NOW
  private static readonly RECENCY_MIN_BOOST = 1.0; // Minimum boost multiplier (no boost) at horizon
  private static readonly RECENCY_HORIZON_DAYS = 30; // Days until boost decays to minimum
  // Decay rate calculated so that the exponential component decays to ~0.01 at the horizon
  // Formula: boost = MIN + (MAX - MIN) * e^(-lambda * days)
  // At horizon: e^(-lambda * HORIZON) ≈ 0.01, so lambda = -ln(0.01) / HORIZON ≈ 4.6 / HORIZON
  private static readonly RECENCY_DECAY_RATE = 4.6 / RerankStepImpl.RECENCY_HORIZON_DAYS;

  constructor(
    node: RerankGraphNode,
    stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger,
    workflowRuntime: WorkflowExecutionRuntimeManager
  ) {
    const rerankStep: RerankStep = {
      name: node.configuration.name,
      type: node.type,
      spaceId: '',
      with: node.configuration.with,
    };
    super(rerankStep, stepExecutionRuntime, undefined, workflowRuntime);
  }

  public getInput() {
    // Use the standard rendering approach - ${{}} syntax will preserve object types
    const rendered =
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(this.step.with);

    return rendered;
  }

  protected async _run(input: any): Promise<RunStepResult> {

    try {
      this.workflowLogger.logInfo('Starting automatic relevance reranking', {
        event: { action: 'rerank-start', outcome: 'unknown' },
        tags: ['rerank', 'elasticsearch'],
      });

      const {
        api_query,
        user_question,
        data,
        data_mapping,
        language_code,
        recognized_entities = [],
        recency_biased,
        date_range_filter,
        max_results = 10,
      } = input;


      this.workflowLogger.logInfo(`Rerank step input received: data.length=${data?.length}, user_question=${user_question}`, {
        event: { action: 'rerank-input', outcome: 'unknown' },
        tags: ['rerank', 'debug'],
      });

      // Step 1: Create dynamic index
      this.workflowLogger.logInfo('Creating dynamic index...', {
        event: { action: 'create-index-start', outcome: 'unknown' },
        tags: ['rerank', 'debug'],
      });
      const indexName = await this.createDynamicIndex(data_mapping, language_code);
      this.workflowLogger.logInfo(`Index created: ${indexName}`, {
        event: { action: 'create-index-complete', outcome: 'success' },
        tags: ['rerank', 'debug'],
      });

      // Step 2: Index documents
      this.workflowLogger.logInfo('Indexing documents...', {
        event: { action: 'index-docs-start', outcome: 'unknown' },
        tags: ['rerank', 'debug'],
      });
      const docIdMap = await this.indexDocuments(data, data_mapping, indexName);
      this.workflowLogger.logInfo('Documents indexed', {
        event: { action: 'index-docs-complete', outcome: 'success' },
        tags: ['rerank', 'debug'],
      });

      // Step 3: Execute multi-strategy search with FORK/FUSE
      this.workflowLogger.logInfo('Executing multi-strategy search...', {
        event: { action: 'search-start', outcome: 'unknown' },
        tags: ['rerank', 'debug'],
      });
      const rerankedData = await this.executeMultiStrategySearch(
        indexName,
        user_question,
        data_mapping,
        recognized_entities,
        recency_biased,
        date_range_filter,
        data,
        docIdMap,
        max_results
      );
      this.workflowLogger.logInfo('Search completed', {
        event: { action: 'search-complete', outcome: 'success' },
        tags: ['rerank', 'debug'],
      });

      // Step 4: Cleanup index
      await this.cleanupIndex(indexName);

      this.workflowLogger.logInfo('Automatic relevance reranking completed', {
        event: { action: 'rerank-complete', outcome: 'success' },
        tags: ['rerank', 'elasticsearch'],
      });


      return {
        input,
        output: rerankedData,
        error: undefined,
      };
    } catch (error) {
      this.workflowLogger.logError('Reranking failed', error as Error, {
        event: { action: 'rerank-failed', outcome: 'failure' },
        tags: ['rerank', 'elasticsearch', 'error'],
      });
      return this.handleFailure(input, error);
    }
  }

  private async createDynamicIndex(
    fieldMappings: FieldMapping[],
    languageCode: string
  ): Promise<string> {
    const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();

    // Build index name: temp-index-{step_name}-{workflow_id}-{timestamp}
    const stepName = this.step.name;
    const workflowExecution = (this.stepExecutionRuntime as any).workflowExecution;
    const workflowId = workflowExecution?.workflowId || 'unknown';
    const timestamp = Date.now();

    const indexName = `temp-index-${stepName}-${workflowId}-${timestamp}`;

    this.workflowLogger.logInfo(`Creating dynamic index: ${indexName}`, {
      event: { action: 'create-index', outcome: 'unknown' },
      tags: ['rerank', 'elasticsearch', 'index'],
    });

    // Build analyzer settings based on language
    const analyzerSettings = this.buildAnalyzerSettings(languageCode);

    // Build dynamic mappings
    const properties: any = {};
    for (const field of fieldMappings) {
      properties[field.alias] = this.buildFieldMapping(field.type, languageCode);

      // Add n-gram and semantic variants for text fields
      if (field.type === 'text_field') {
        properties[`${field.alias}_bigram`] = {
          type: 'text',
          analyzer: 'lang_bigram_analyzer',
        };
        properties[`${field.alias}_trigram`] = {
          type: 'text',
          analyzer: 'lang_trigram_analyzer',
        };
        properties[`${field.alias}_semantic`] = {
          type: 'semantic_text',
        };
      }
    }

    await esClient.indices.create({
      index: indexName,
      settings: {
        analysis: analyzerSettings,
      },
      mappings: {
        properties,
      },
    });

    this.workflowLogger.logInfo(`Index created successfully: ${indexName}`, {
      event: { action: 'create-index', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'index'],
    });

    return indexName;
  }

  private buildAnalyzerSettings(languageCode: string): any {
    const commonFilters = {
      bigram_filter: {
        type: 'shingle',
        min_shingle_size: 2,
        max_shingle_size: 2,
        output_unigrams: false,
      },
      trigram_filter: {
        type: 'shingle',
        min_shingle_size: 3,
        max_shingle_size: 3,
        output_unigrams: false,
      },
    };

    const languageFilters: any = { ...commonFilters };
    const baseAnalyzerFilters: string[] = ['lowercase'];

    if (languageCode === 'en') {
      languageFilters.english_stop = { type: 'stop', stopwords: '_english_' };
      languageFilters.english_stemmer = { type: 'stemmer', language: 'english' };
      languageFilters.english_possessive_stemmer = {
        type: 'stemmer',
        language: 'possessive_english',
      };
      baseAnalyzerFilters.push(
        'english_possessive_stemmer',
        'english_stop',
        'english_stemmer'
      );
    } else if (languageCode === 'es') {
      languageFilters.spanish_stop = { type: 'stop', stopwords: '_spanish_' };
      languageFilters.spanish_stemmer = { type: 'stemmer', language: 'spanish' };
      baseAnalyzerFilters.push('spanish_stop', 'spanish_stemmer');
    } else if (languageCode === 'fr') {
      languageFilters.french_stop = { type: 'stop', stopwords: '_french_' };
      languageFilters.french_stemmer = { type: 'stemmer', language: 'french' };
      languageFilters.french_elision = {
        type: 'elision',
        articles_case: true,
        articles: ['l', 'm', 't', 'qu', 'n', 's', 'j', 'd', 'c'],
      };
      baseAnalyzerFilters.push('french_elision', 'french_stop', 'french_stemmer');
    }

    return {
      filter: languageFilters,
      analyzer: {
        lang_bigram_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [...baseAnalyzerFilters, 'bigram_filter'],
        },
        lang_trigram_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [...baseAnalyzerFilters, 'trigram_filter'],
        },
      },
    };
  }

  private buildFieldMapping(fieldType: string, languageCode: string): any {
    switch (fieldType) {
      case 'text_field':
        // Map language codes to Elasticsearch built-in analyzer names
        const analyzerMap: Record<string, string> = {
          en: 'english',
          es: 'spanish',
          fr: 'french',
          default: 'standard',
        };
        return {
          type: 'text',
          analyzer: analyzerMap[languageCode] || 'standard',
          fields: { keyword: { type: 'keyword' } },
        };
      case 'filter_field':
        return { type: 'keyword' };
      case 'date_field':
        return { type: 'date', format: 'epoch_second' };
      case 'numeric_field':
        return { type: 'float' };
      default:
        return { type: 'keyword' };
    }
  }

  private async indexDocuments(
    data: any[],
    fieldMappings: FieldMapping[],
    indexName: string
  ): Promise<Map<string, number>> {
    const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();

    this.workflowLogger.logInfo(`Indexing ${data.length} documents to ${indexName}`, {
      event: { action: 'bulk-index', outcome: 'unknown' },
      tags: ['rerank', 'elasticsearch', 'bulk'],
    });

    // Map to track document ID -> original array index
    const docIdToOriginalIndex = new Map<string, number>();

    // Build bulk index operations
    const bulkOperations: any[] = [];
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      // Use array index as the document ID so we can map back later
      const docId = `doc-${i}`;
      bulkOperations.push({ index: { _index: indexName, _id: docId } });
      docIdToOriginalIndex.set(docId, i);

      // Build document dynamically based on field mappings
      const doc: any = {};
      for (const field of fieldMappings) {
        const value = this.extractFieldValue(record, field.path);
        doc[field.alias] = value;

        // Add n-gram and semantic variants for text fields (only if value is a string)
        if (field.type === 'text_field' && typeof value === 'string') {
          doc[`${field.alias}_bigram`] = value;
          doc[`${field.alias}_trigram`] = value;
          doc[`${field.alias}_semantic`] = value;
        }
      }

      bulkOperations.push(doc);
    }

    await esClient.bulk({
      refresh: true,
      operations: bulkOperations,
    });

    this.workflowLogger.logInfo(`Successfully indexed ${data.length} documents`, {
      event: { action: 'bulk-index', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'bulk'],
    });

    return docIdToOriginalIndex;
  }

  private extractFieldValue(record: any, path: string[]): any {
    let value = record;
    for (const part of path) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }
    return value;
  }

  private async executeMultiStrategySearch(
    indexName: string,
    userQuestion: string,
    fieldMappings: FieldMapping[],
    recognizedEntities: string[],
    recencyBiased: boolean,
    dateRangeFilter: [string, string] | null | undefined,
    originalData: any[],
    docIdMap: Map<string, number>,
    maxResults: number
  ): Promise<any[]> {
    const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();

    this.workflowLogger.logInfo(`Executing multi-strategy search on ${indexName}`, {
      event: { action: 'multi-strategy-search', outcome: 'unknown' },
      tags: ['rerank', 'elasticsearch', 'esql'],
    });

    // Find all text fields
    const textFields = fieldMappings
      .filter((f) => f.type === 'text_field')
      .map((f) => f.alias);

    if (textFields.length === 0) {
      throw new Error('No text field found in data_mapping for search');
    }

    // Find date field for recency bias
    const dateField = fieldMappings.find((f) => f.type === 'date_field')?.alias;

    // Build ES|QL query with FORK/FUSE
    let esqlQuery = `FROM ${indexName} METADATA _id, _index, _score`;

    // Add date range filter if provided
    if (dateRangeFilter && dateRangeFilter.length === 2 && dateField) {
      esqlQuery += `\n| WHERE ${dateField} >= "${dateRangeFilter[0]}" AND ${dateField} <= "${dateRangeFilter[1]}"`;
    }

    // Build FORK branches for multi-strategy ranking
    // Each branch searches across ALL text fields with OR to combine scores
    const forkBranches: string[] = [
      // Base text search across all fields
      `(WHERE ${textFields.map(f => `${f}: "${userQuestion}"`).join(' OR ')} | SORT _score DESC)`,
      // Bigram search across all fields
      `(WHERE ${textFields.map(f => `${f}_bigram: "${userQuestion}"`).join(' OR ')} | SORT _score DESC)`,
      // Trigram search across all fields
      `(WHERE ${textFields.map(f => `${f}_trigram: "${userQuestion}"`).join(' OR ')} | SORT _score DESC)`,
      // Semantic search across all fields
      `(WHERE ${textFields.map(f => `match(${f}_semantic, "${userQuestion}")`).join(' OR ')} | SORT _score DESC)`,
    ];

    // Track the number of main search strategy branches (before entity branches)
    const numMainBranches = forkBranches.length;

    // Add entity boosting if entities provided
    // Create branches that search for entities across ALL fields with flat score
    if (recognizedEntities.length > 0) {
      const keywordFields = fieldMappings
        .filter((f) => f.type === 'filter_field')
        .map((f) => f.alias);

      for (const entity of recognizedEntities) {
        // For text fields, use full-text search with ":"
        // For keyword fields, use exact match with "=="
        const textMatches = textFields.map(f => `${f}: "${entity}"`);
        const keywordMatches = keywordFields.map(f => `${f} == "${entity}"`);

        const allMatches = [...textMatches, ...keywordMatches];

        // Generate flat score: filter for matches, then assign constant score of 1.0
        forkBranches.push(
          `(WHERE ${allMatches.join(' OR ')} | EVAL _score = 1.0 | SORT _score DESC)`
        );
      }
    }

    esqlQuery += `\n| FORK\n  ${forkBranches.join('\n  ')}`;

    // Build weights object for FUSE
    // Main search strategies get weight 1.0, entity branches get weight 0.5
    const weights: Record<string, number> = {};
    for (let i = 1; i <= forkBranches.length; i++) {
      // Entity branches start after the main branches
      const isEntityBranch = i > numMainBranches;
      weights[`fork${i}`] = isEntityBranch ? 0.5 : 1.0;
    }

    // Apply FUSE with recency bias if enabled
    esqlQuery += `\n| FUSE LINEAR WITH { "weights": ${JSON.stringify(weights)}, "normalizer": "minmax" }`;

    // Add recency boost if enabled and date field exists
    if (recencyBiased && dateField) {
      const maxBoost = RerankStepImpl.RECENCY_MAX_BOOST;
      const minBoost = RerankStepImpl.RECENCY_MIN_BOOST;
      const decayRate = RerankStepImpl.RECENCY_DECAY_RATE;

      // Exponential decay recency boost: configurable boost decay over time
      // Formula: boost = MIN_BOOST + (MAX_BOOST - MIN_BOOST) * e^(-decay_rate * age_in_days)
      // Current config: 2.0x at NOW, 1.0x (no boost) at 30 days

      // Step 1: Calculate age in days from now
      // Convert both NOW() and the date field to long (milliseconds) before subtracting
      esqlQuery += `\n| EVAL age_ms = TO_LONG(NOW()) - TO_LONG(${dateField})`;
      esqlQuery += `\n| EVAL age_days = age_ms / 86400000.0`; // 86400000 ms = 1 day

      // Step 2: Calculate exponential decay boost
      // ES|QL uses EXP() function for e^x
      esqlQuery += `\n| EVAL recency_boost = ${minBoost} + ${maxBoost - minBoost} * EXP(-${decayRate} * age_days)`;

      // Step 3: Apply boost by multiplying the relevance score
      esqlQuery += `\n| EVAL final_score = _score * recency_boost`;
      esqlQuery += `\n| SORT final_score DESC`;
    } else {
      esqlQuery += `\n| SORT _score DESC`;
    }

    // First limit to 100 results for initial retrieval
    esqlQuery += `\n| LIMIT 100`;

    // Apply semantic RERANK across all searchable fields (text + filter/keyword) for final refinement
    const allRerankFields = fieldMappings
      .filter((f) => f.type === 'text_field' || f.type === 'filter_field')
      .map((f) => f.alias);
    esqlQuery += `\n| RERANK rerank_score = "${userQuestion}" ON ${allRerankFields.join(', ')}`;

    // Sort by rerank score and limit to final max_results
    esqlQuery += `\n| SORT rerank_score DESC`;
    esqlQuery += `\n| LIMIT ${maxResults}`;

    // Build KEEP clause to return relevant fields including _id for mapping back to original data
    const keepFields = fieldMappings
      .filter((f) => f.type !== 'numeric_field')
      .map((f) => f.alias);
    esqlQuery += `\n| KEEP ${keepFields.join(', ')}, _score, rerank_score, _id`;

    this.workflowLogger.logInfo(`Executing ES|QL query:\n${esqlQuery}`, {
      event: { action: 'multi-strategy-search', outcome: 'unknown' },
      tags: ['rerank', 'elasticsearch', 'esql', 'query'],
    });

    // Use the ES|QL query API with proper format
    const requestBody = {
      query: esqlQuery,
    };


    this.workflowLogger.logInfo(`ES|QL request body: ${JSON.stringify(requestBody, null, 2)}`, {
      event: { action: 'multi-strategy-search', outcome: 'unknown' },
      tags: ['rerank', 'elasticsearch', 'esql', 'debug'],
    });

    let response;
    const queryStartTime = Date.now();
    try {
      response = await esClient.transport.request({
        method: 'POST',
        path: '/_query?format=json',
        body: requestBody,
      }, {
        requestTimeout: 120000, // 120 second timeout for rerank operations
      });
      const queryEndTime = Date.now();
      const queryTime = queryEndTime - queryStartTime;
      const esqlResponse = response as any;


      this.workflowLogger.logInfo(`ES|QL response received: ${JSON.stringify(response, null, 2)}`, {
        event: { action: 'multi-strategy-search', outcome: 'success' },
        tags: ['rerank', 'elasticsearch', 'esql', 'debug'],
      });
    } catch (error) {
      this.workflowLogger.logError(`ES|QL request failed`, error as Error, {
        event: { action: 'multi-strategy-search', outcome: 'failure' },
        tags: ['rerank', 'elasticsearch', 'esql', 'error'],
      });
      throw error;
    }

    this.workflowLogger.logInfo('Multi-strategy search completed', {
      event: { action: 'multi-strategy-search', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'esql'],
    });

    // Map ES|QL results back to original data objects in ranked order
    // ES|QL returns: { columns: [...], values: [[...], [...]] }
    const esqlResponse = response as any;

    // Debug: Log the ES|QL response structure

    this.workflowLogger.logInfo(`ES|QL Response Structure:`, {
      event: { action: 'esql-response-debug', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'esql', 'debug'],
    });
    this.workflowLogger.logInfo(`Columns: ${JSON.stringify(esqlResponse.columns)}`, {
      event: { action: 'esql-response-debug', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'esql', 'debug'],
    });
    this.workflowLogger.logInfo(`Number of result rows: ${esqlResponse.values?.length || 0}`, {
      event: { action: 'esql-response-debug', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'esql', 'debug'],
    });
    this.workflowLogger.logInfo(`First few rows: ${JSON.stringify(esqlResponse.values?.slice(0, 3), null, 2)}`, {
      event: { action: 'esql-response-debug', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'esql', 'debug'],
    });

    // Find the _id column index
    const idColumnIndex = esqlResponse.columns.findIndex((col: any) => col.name === '_id');

    if (idColumnIndex === -1) {
      this.workflowLogger.logError('_id column not found in ES|QL response', new Error('Missing _id'), {
        event: { action: 'multi-strategy-search', outcome: 'failure' },
        tags: ['rerank', 'elasticsearch', 'esql', 'error'],
      });
      // Fallback: return original data in original order
      return originalData;
    }

    // Map each result row to the original data object

    const rerankedData = esqlResponse.values
      .map((row: any[], idx: number) => {
        const docId = row[idColumnIndex];
        const originalIndex = docIdMap.get(docId);

        if (originalIndex !== undefined) {
          const originalItem = originalData[originalIndex];
          return originalItem;
        }
        return null;
      })
      .filter((item: any) => item !== null);

    this.workflowLogger.logInfo(`Reranked ${rerankedData.length} documents`, {
      event: { action: 'multi-strategy-search', outcome: 'success' },
      tags: ['rerank', 'elasticsearch', 'esql'],
    });

    return rerankedData;
  }

  private async cleanupIndex(indexName: string): Promise<void> {
    const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();

    this.workflowLogger.logInfo(`Cleaning up index: ${indexName}`, {
      event: { action: 'cleanup-index', outcome: 'unknown' },
      tags: ['rerank', 'elasticsearch', 'cleanup'],
    });

    try {
      await esClient.indices.delete({ index: indexName });
      this.workflowLogger.logInfo(`Index deleted successfully: ${indexName}`, {
        event: { action: 'cleanup-index', outcome: 'success' },
        tags: ['rerank', 'elasticsearch', 'cleanup'],
      });
    } catch (error) {
      this.workflowLogger.logError(`Failed to delete index: ${indexName}`, error as Error, {
        event: { action: 'cleanup-index', outcome: 'failure' },
        tags: ['rerank', 'elasticsearch', 'cleanup', 'error'],
      });
      // Don't fail the whole step if cleanup fails
    }
  }
}

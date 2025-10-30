/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutSession } from '../session';
import type { EsQueryParams, KibanaApiParams, ToolResult } from '../types';
import { ResponseBuilder, success } from '../utils';

/**
 * Execute an Elasticsearch query
 */
export async function scoutEsQuery(
  session: ScoutSession,
  params: EsQueryParams
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  if (!params.index) {
    return response.setError('index parameter is required').buildAsToolResult();
  }

  if (!params.body) {
    return response.setError('body parameter is required (ES query DSL)').buildAsToolResult();
  }

  try {
    const esClient = await session.getEsClient();

    // Execute the search query
    const result = await esClient.search({
      index: params.index,
      body: params.body,
    });

    response.setResult(`Query executed successfully on index: ${params.index}`);
    response.addCode(
      `await esClient.search(${JSON.stringify(
        { index: params.index, body: params.body },
        null,
        2
      )});`,
      'typescript'
    );

    // Add query results
    const hits = result.hits?.hits || [];
    const total =
      typeof result.hits?.total === 'object' ? result.hits.total.value : result.hits?.total;

    response.addSection(
      'Query Results',
      `- Total hits: ${total}\n- Returned: ${hits.length} documents\n- Took: ${result.took}ms`
    );

    // Add sample results (first 3 documents)
    if (hits.length > 0) {
      const samples = hits.slice(0, 3).map((hit: any) => ({
        _id: hit._id,
        _source: hit._source,
      }));
      response.addSection(
        'Sample Documents',
        `\`\`\`json\n${JSON.stringify(samples, null, 2)}\n\`\`\``
      );
    }

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`ES query failed: ${message}`)
      .addSection(
        'Suggestion',
        'Check the index name and query DSL syntax. Use standard Elasticsearch query format.'
      )
      .buildAsToolResult();
  }
}

/**
 * Index a document or documents into Elasticsearch
 */
export async function scoutEsIndex(
  session: ScoutSession,
  params: { index: string; documents: any[] | any; refresh?: boolean }
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  if (!params.index) {
    return response.setError('index parameter is required').buildAsToolResult();
  }

  if (!params.documents) {
    return response.setError('documents parameter is required').buildAsToolResult();
  }

  try {
    const esClient = await session.getEsClient();
    const docs = Array.isArray(params.documents) ? params.documents : [params.documents];
    const refresh = params.refresh ?? true;

    // Use bulk API for efficiency
    const body = docs.flatMap((doc) => [{ index: { _index: params.index } }, doc]);

    const result = await esClient.bulk({
      body,
      refresh: refresh ? 'true' : 'false',
    });

    const indexed = docs.length;
    const errors = result.items?.filter((item: any) => item.index?.error) || [];

    response.setResult(`Successfully indexed ${indexed} document(s) into ${params.index}`);
    response.addCode(
      `await esClient.bulk({\n  body: [\n    { index: { _index: '${
        params.index
      }' } },\n    ${JSON.stringify(docs[0], null, 2)}\n  ],\n  refresh: ${refresh}\n});`,
      'typescript'
    );

    response.addSection(
      'Index Results',
      `- Documents indexed: ${indexed}\n- Errors: ${errors.length}\n- Took: ${result.took}ms`
    );

    if (errors.length > 0) {
      response.addSection(
        'Errors',
        `\`\`\`json\n${JSON.stringify(errors.slice(0, 3), null, 2)}\n\`\`\``
      );
    }

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`ES index failed: ${message}`)
      .addSection('Suggestion', 'Check the index name and document structure.')
      .buildAsToolResult();
  }
}

/**
 * Delete documents from Elasticsearch
 */
export async function scoutEsDelete(
  session: ScoutSession,
  params: { index: string; query?: any; id?: string; refresh?: boolean }
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  if (!params.index) {
    return response.setError('index parameter is required').buildAsToolResult();
  }

  if (!params.query && !params.id) {
    return response.setError('Either query or id parameter must be provided').buildAsToolResult();
  }

  try {
    const esClient = await session.getEsClient();
    const refresh = params.refresh ?? true;
    let deletedCount = 0;
    let codeSnippet = '';

    if (params.id) {
      // Delete by ID
      await esClient.delete({
        index: params.index,
        id: params.id,
        refresh: refresh ? 'true' : 'false',
      });
      deletedCount = 1;
      codeSnippet = `await esClient.delete({ index: '${params.index}', id: '${params.id}', refresh: ${refresh} });`;
      response.setResult(`Successfully deleted document with ID: ${params.id}`);
    } else {
      // Delete by query
      const result = await esClient.deleteByQuery({
        index: params.index,
        body: { query: params.query },
        refresh,
      });
      deletedCount = result.deleted || 0;
      codeSnippet = `await esClient.deleteByQuery({\n  index: '${
        params.index
      }',\n  body: { query: ${JSON.stringify(params.query)} },\n  refresh: ${refresh}\n});`;
      response.setResult(`Successfully deleted ${deletedCount} document(s) from ${params.index}`);
    }

    response.addCode(codeSnippet, 'typescript');
    response.addSection(
      'Delete Results',
      `- Documents deleted: ${deletedCount}\n- Index: ${params.index}`
    );

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`ES delete failed: ${message}`)
      .addSection(
        'Suggestion',
        'Check the index name and query. Document ID may not exist or query may not match any documents.'
      )
      .buildAsToolResult();
  }
}

/**
 * Make a generic Kibana API call
 */
export async function scoutKibanaApi(
  session: ScoutSession,
  params: KibanaApiParams
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  if (!params.method) {
    return response
      .setError('method parameter is required (GET, POST, PUT, DELETE, PATCH)')
      .buildAsToolResult();
  }

  if (!params.path) {
    return response
      .setError('path parameter is required (e.g., /api/data_views/data_view)')
      .buildAsToolResult();
  }

  try {
    const kbnClient = await session.getKbnClient();

    // Make the API call
    const result = await kbnClient.request({
      method: params.method,
      path: params.path,
      body: params.body,
    });

    response.setResult(`Successfully executed ${params.method} request to ${params.path}`);

    const codeSnippet = params.body
      ? `await kbnClient.request({\n  method: '${params.method}',\n  path: '${
          params.path
        }',\n  body: ${JSON.stringify(params.body, null, 2)}\n});`
      : `await kbnClient.request({ method: '${params.method}', path: '${params.path}' });`;

    response.addCode(codeSnippet, 'typescript');

    response.addSection('API Response', `- Status: ${result.status}\n- Path: ${params.path}`);

    // Add response data if present
    if (result.data) {
      const dataPreview =
        typeof result.data === 'object'
          ? JSON.stringify(result.data, null, 2)
          : String(result.data);
      response.addSection('Response Data', `\`\`\`json\n${dataPreview}\n\`\`\``);
    }

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`Kibana API call failed: ${message}`)
      .addSection(
        'Suggestion',
        `Check the API path and method. Common paths:
- /api/data_views/data_view - Data views API
- /api/saved_objects/_find - Find saved objects
- /api/security/role - Manage roles
- /api/alerting/rule - Alerting rules`
      )
      .buildAsToolResult();
  }
}

/**
 * Create a Kibana data view
 */
export async function scoutKibanaCreateDataView(
  session: ScoutSession,
  params: {
    title: string;
    name?: string;
    timeFieldName?: string;
    id?: string;
  }
): Promise<ToolResult> {
  const response = new ResponseBuilder();

  if (!session.isInitialized()) {
    return response.setError('Session not initialized. Use login tool first.').buildAsToolResult();
  }

  if (!params.title) {
    return response
      .setError('title parameter is required (index pattern, e.g., "logs-*")')
      .buildAsToolResult();
  }

  try {
    const kbnClient = await session.getKbnClient();

    const dataViewBody = {
      data_view: {
        title: params.title,
        name: params.name || params.title,
        ...(params.timeFieldName && { timeFieldName: params.timeFieldName }),
        ...(params.id && { id: params.id }),
      },
    };

    const result = await kbnClient.request({
      method: 'POST',
      path: '/api/data_views/data_view',
      body: dataViewBody,
    });

    response.setResult(`Successfully created data view: ${params.title}`);
    response.addCode(
      `await kbnClient.request({\n  method: 'POST',\n  path: '/api/data_views/data_view',\n  body: ${JSON.stringify(
        dataViewBody,
        null,
        2
      )}\n});`,
      'typescript'
    );

    const dataView = (result.data as any)?.data_view;
    if (dataView) {
      response.addSection(
        'Data View Details',
        `- ID: ${dataView.id}\n- Title: ${dataView.title}\n- Name: ${dataView.name}${
          params.timeFieldName ? `\n- Time field: ${params.timeFieldName}` : ''
        }`
      );
    }

    return response.buildAsToolResult();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return response
      .setError(`Create data view failed: ${message}`)
      .addSection(
        'Suggestion',
        'Check that the index pattern exists in Elasticsearch and matches the title pattern.'
      )
      .buildAsToolResult();
  }
}

/**
 * List available API services (reference guide)
 */
export async function scoutListApiServices(): Promise<ToolResult> {
  return success({
    services: {
      elasticsearch: {
        description: 'Elasticsearch client tools',
        tools: ['scoutEsQuery', 'scoutEsIndex', 'scoutEsDelete'],
        note: 'Now fully implemented!',
      },
      kibana: {
        description: 'Kibana API client tools',
        tools: ['scoutKibanaApi', 'scoutKibanaCreateDataView'],
        commonPaths: [
          '/api/data_views/data_view - Data views',
          '/api/saved_objects/_find - Saved objects',
          '/api/security/role - Security roles',
          '/api/alerting/rule - Alerting rules',
          '/api/cases/api/cases - Cases',
        ],
        note: 'Generic API client now available!',
      },
    },
    message: 'ES and Kibana API tools are now fully implemented in the MCP server',
  });
}

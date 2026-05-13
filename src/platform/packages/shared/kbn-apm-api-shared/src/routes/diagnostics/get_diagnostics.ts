/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';
import type {
  FieldCapsResponse,
  IndicesDataStream,
  IndicesGetIndexTemplateIndexTemplateItem,
  IndicesGetResponse,
  IngestGetPipelineResponse,
  SecurityHasPrivilegesPrivileges,
} from '@elastic/elasticsearch/lib/api/types';
import type { APMIndices, ApmEvent, IndiciesItem } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface DiagnosticsResponse {
  esResponses: {
    existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[];
    fieldCaps?: FieldCapsResponse;
    indices?: IndicesGetResponse;
    ingestPipelines?: IngestGetPipelineResponse;
  };
  diagnosticsPrivileges: {
    index: Record<string, SecurityHasPrivilegesPrivileges>;
    cluster: Record<string, boolean>;
    hasAllClusterPrivileges: boolean;
    hasAllIndexPrivileges: boolean;
    hasAllPrivileges: boolean;
  };
  apmIndices: APMIndices;
  apmIndexTemplates: Array<{
    name: string;
    isNonStandard: boolean;
    exists: boolean;
  }>;
  fleetPackageInfo: {
    isInstalled: boolean;
    version?: string;
  };
  kibanaVersion: string;
  elasticsearchVersion: string;
  apmEvents: ApmEvent[];
  invalidIndices?: IndiciesItem[];
  validIndices?: IndiciesItem[];
  dataStreams: IndicesDataStream[];
  nonDataStreamIndices: string[];
  indexTemplatesByIndexPattern: Array<{
    indexPattern: string;
    indexTemplates: Array<{
      priority: number | undefined;
      isNonStandard: boolean;
      templateIndexPatterns: string[];
      templateName: string;
    }>;
  }>;
  params: { start: number; end: number; kuery?: string };
}

export const getDiagnosticsRoute = defineRoute<DiagnosticsResponse>()({
  endpoint: 'GET /internal/apm/diagnostics',
  params: t.partial({
    query: t.partial({
      kuery: t.string,
      start: isoToEpochRt,
      end: isoToEpochRt,
    }),
  }),
});

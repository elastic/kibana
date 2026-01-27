/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentName, EventOutcome, StatusCode } from '@kbn/apm-types';
import { STATUS_CODE, EVENT_OUTCOME } from '@kbn/apm-types';

const STATUS_FIELD_NAME = [EVENT_OUTCOME, STATUS_CODE] as const;

export type CompressionStrategy = 'exact_match' | 'same_kind';

export interface TraceItemComposite {
  count: number;
  sum: number;
  compressionStrategy: CompressionStrategy;
}

export interface TraceItem {
  id: string;
  timestampUs: number;
  name: string;
  traceId: string;
  duration: number;
  errors: Array<{ errorDocId: string; errorDocIndex?: string }>;
  status?: {
    fieldName: (typeof STATUS_FIELD_NAME)[number];
    value: EventOutcome | StatusCode;
  };
  parentId?: string;
  serviceName: string;
  type?: string;
  sync?: boolean;
  agentName?: AgentName;
  spanLinksCount: {
    incoming: number;
    outgoing: number;
  };
  icon?: string;
  coldstart?: boolean;
  composite?: TraceItemComposite;
}

export type WaterfallGetRelatedErrorsHref = (docId: string) => string;

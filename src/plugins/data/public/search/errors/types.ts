/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KibanaServerError } from '../../../../kibana_utils/common';

export interface FailedShard {
  shard: number;
  index: string;
  node: string;
  reason: Reason;
}

export interface Reason {
  type: string;
  reason: string;
  script_stack?: string[];
  position?: {
    offset: number;
    start: number;
    end: number;
  };
  lang?: string;
  script?: string;
  caused_by?: {
    type: string;
    reason: string;
  };
}

export interface IEsErrorAttributes {
  type: string;
  reason: string;
  root_cause?: Reason[];
  failed_shards?: FailedShard[];
}

export type IEsError = KibanaServerError<IEsErrorAttributes>;

/**
 * Checks if a given errors originated from Elasticsearch.
 * Those params are assigned to the attributes property of an error.
 *
 * @param e
 */
export function isEsError(e: any): e is IEsError {
  return !!e.attributes;
}

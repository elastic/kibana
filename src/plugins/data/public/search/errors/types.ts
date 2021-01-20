/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface FailedShard {
  shard: number;
  index: string;
  node: string;
  reason: {
    type: string;
    reason: string;
    script_stack: string[];
    script: string;
    lang: string;
    position: {
      offset: number;
      start: number;
      end: number;
    };
    caused_by: {
      type: string;
      reason: string;
    };
  };
}

export interface IEsError {
  body: {
    statusCode: number;
    error: string;
    message: string;
    attributes?: {
      error?: {
        root_cause?: [
          {
            lang: string;
            script: string;
          }
        ];
        type: string;
        reason: string;
        failed_shards: FailedShard[];
        caused_by: {
          type: string;
          reason: string;
          phase: string;
          grouped: boolean;
          failed_shards: FailedShard[];
          script_stack: string[];
        };
      };
    };
  };
}

export function isEsError(e: any): e is IEsError {
  return !!e.body?.attributes;
}

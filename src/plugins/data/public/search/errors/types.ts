/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

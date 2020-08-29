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

export interface RealTimeOperationsDriver {
  commit<T>(type: string, id: string, op: Json1Operation, snapshot: T): Promise<void>;
  getSnapshot<T>(type: string, id: string): Promise<T>;
  getOps(type: string, id: string, from: number): Promise<RealTimeOperation>;
}

export interface RealTimeOperation {
  /**
   * Saved object type.
   */
  type: string;

  /**
   * Saved object ID.
   */
  id: string;

  /**
   * ID of the previous operation.
   */
  prev: string;

  /**
   * Sequence number of the operation.
   */
  version: number;

  /**
   * JSON1 OT operation.
   */
  operation: Json1Operation;
}

export type Json1Operation = object;

/**
 * These fields are applied inline to every saved object managed by real_time
 * plugin.
 */
export interface RealTimeSnapshotFields {
  /**
   * Latest sequence number for this document.
   */
  __real_time_version: number;

  /**
   * ID of the last operation applied to this document.
   */
  __real_time_operation: number;
}

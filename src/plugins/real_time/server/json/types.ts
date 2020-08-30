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

import { JSONOp, Doc } from 'ot-json1';

export interface IRealTimeJsonClient {
  create(collection: string, id: string): Promise<void>;
}

/**
 * Real time JSON client storage driver interface. This interface can be
 * implemented in-memory or to persist into Elasticsearch, or anywhere else.
 *
 * Operation sequence number strats from 0 and is incremented by one with each
 * new successfully commited operation.
 */
export interface RealTimeJsonDriver {
  /**
   * Commit the latest operation to the persisten storage and update the snapshot.
   * Should throw on error.
   *
   * @param type Saved object type, i.e. "collection" name.
   * @param id Id of the saved object, i.e. ID of the document.
   * @param op Operation to be commited.
   * @param snapshot Up-to-date snapshot with the latest operation applied.
   */
  commit(
    type: string,
    id: string,
    operation: RealTimeOperation,
    snapshot: Doc,
    options?: { create?: boolean }
  ): Promise<void>;

  /**
   * Retrieve the latest snapshot of the document.
   *
   * @param type Saved object type, i.e. "collection" name.
   * @param id Id of the saved object, i.e. ID of the document.
   */
  getSnapshot(type: string, id: string): Promise<Doc>;

  /**
   * Get all the latest operations starting from "from" operations all the way
   * up to the latest operation.
   *
   * @param type Saved object type, i.e. "collection" name.
   * @param id Id of the saved object, i.e. ID of the document.
   * @param min Sequence number starting from which to fetch the operations.
   */
  getOps(type: string, id: string, min: number): Promise<RealTimeOperation[]>;
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
  op: JSONOp;
}

export type Json1Operation = unknown[];

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

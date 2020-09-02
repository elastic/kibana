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

import { DataTelemetryType, DataPatternName } from './constants';

export interface DataTelemetryBasePayload {
  index_count: number;
  ecs_index_count?: number;
  doc_count?: number;
  size_in_bytes?: number;
}

export interface DataTelemetryDocument extends DataTelemetryBasePayload {
  data_stream?: {
    dataset?: string;
    type?: DataTelemetryType | string; // The union of types is to help autocompletion with some known `data_stream.type`s
  };
  package?: {
    name: string;
  };
  shipper?: string;
  pattern_name?: DataPatternName;
}

export type DataTelemetryPayload = DataTelemetryDocument[];

export interface DataTelemetryIndex {
  name: string;
  packageName?: string; // Populated by Ingest Manager at `_meta.package.name`
  managedBy?: string; // Populated by Ingest Manager at `_meta.managed_by`
  dataStreamDataset?: string; // To be obtained from `mappings.data_stream.dataset` if it's a constant keyword
  dataStreamType?: string; // To be obtained from `mappings.data_stream.type` if it's a constant keyword
  shipper?: string; // To be obtained from `_meta.beat` if it's set
  isECS?: boolean; // Optional because it can't be obtained via Monitoring.

  // The fields below are optional because we might not be able to obtain them if the user does not
  // have access to the index.
  docCount?: number;
  sizeInBytes?: number;
}

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export type DataDescriptor = AtLeastOne<{
  packageName: string;
  dataStreamDataset: string;
  dataStreamType: string;
  shipper: string;
  patternName: DataPatternName; // When found from the list of the index patterns
}>;
export interface IndexStats {
  indices: {
    [indexName: string]: {
      total: {
        docs: {
          count: number;
          deleted: number;
        };
        store: {
          size_in_bytes: number;
        };
      };
    };
  };
}

export interface IndexMappings {
  [indexName: string]: {
    mappings: {
      _meta?: {
        beat?: string;

        // Ingest Manager provided metadata
        package?: {
          name?: string;
        };
        managed_by?: string; // Typically "ingest-manager"
      };
      properties: {
        data_stream?: {
          properties: {
            dataset?: {
              type: string;
              value?: string;
            };
            type?: {
              type: string;
              value?: string;
            };
          };
        };
        ecs?: {
          properties: {
            version?: {
              type: string;
            };
          };
        };
      };
    };
  };
}

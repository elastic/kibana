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

export interface PutMappingOpts {
  index: string;
  type: 'doc';
  body: DocMapping;
}

export interface GetMappingOpts {
  index: string;
}

export interface PutTemplateOpts {
  name: string;
  body: {
    template: string;
    settings: {
      number_of_shards: number;
      auto_expand_replicas: string;
    };
    mappings: IndexMapping;
  };
}

export interface MappingResult {
  [index: string]: {
    mappings: IndexMapping;
  };
}

export interface CallCluster {
  (path: 'indices.putMapping', opts: PutMappingOpts): Promise<any>;
  (path: 'indices.getMapping', opts: GetMappingOpts): Promise<MappingResult>;
  (path: 'indices.putTemplate', opts: PutTemplateOpts): Promise<any>;
}

export interface MappingDefinition {
  [type: string]: any;
}

export interface DocMapping {
  dynamic: string;
  _meta?: { kibanaVersion: string };
  properties: MappingDefinition;
}

export interface IndexMapping {
  doc: DocMapping;
}

export interface MigrationPlugin {
  id: string;
  mappings?: MappingDefinition;
}

export type LogFunction = ((metadata: string[], message: string) => any);

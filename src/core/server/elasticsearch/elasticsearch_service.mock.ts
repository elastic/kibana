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
import { BehaviorSubject } from 'rxjs';
import { ClusterClient } from './cluster_client';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService, ElasticsearchServiceStart } from './elasticsearch_service';

const createStartContractMock = () => {
  const startContract: ElasticsearchServiceStart = {
    legacy: {
      config$: new BehaviorSubject({} as ElasticsearchConfig),
    },

    createClient: jest.fn(),
    adminClient$: new BehaviorSubject({} as ClusterClient),
    dataClient$: new BehaviorSubject({} as ClusterClient),
  };
  return startContract;
};

type MethodKeysOf<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T];

type PublicMethodsOf<T> = Pick<T, MethodKeysOf<T>>;

type ElasticsearchServiceContract = PublicMethodsOf<ElasticsearchService>;
const createMock = () => {
  const mocked: jest.Mocked<ElasticsearchServiceContract> = {
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.start.mockResolvedValue(createStartContractMock());
  mocked.stop.mockResolvedValue();
  return mocked;
};

export const elasticsearchServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};

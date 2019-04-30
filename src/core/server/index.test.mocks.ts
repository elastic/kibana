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

import { httpServiceMock } from './http/http_service.mock';
export const httpService = httpServiceMock.create();
jest.doMock('./http/http_service', () => ({
  HttpService: jest.fn(() => httpService),
}));

export const mockPluginsService = { setup: jest.fn(), start: jest.fn(), stop: jest.fn() };
jest.doMock('./plugins/plugins_service', () => ({
  PluginsService: jest.fn(() => mockPluginsService),
}));

import { elasticsearchServiceMock } from './elasticsearch/elasticsearch_service.mock';
export const elasticsearchService = elasticsearchServiceMock.create();
jest.doMock('./elasticsearch/elasticsearch_service', () => ({
  ElasticsearchService: jest.fn(() => elasticsearchService),
}));

export const mockLegacyService = { setup: jest.fn(), start: jest.fn(), stop: jest.fn() };
jest.mock('./legacy/legacy_service', () => ({
  LegacyService: jest.fn(() => mockLegacyService),
}));

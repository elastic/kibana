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

jest.mock('../../lib/proxy_request', () => ({
  proxyRequest: jest.fn(),
}));

import { duration } from 'moment';
import { ProxyConfigCollection } from '../../lib';
import { CreateHandlerDependencies } from '../../routes/api/console/proxy/create_handler';
import { coreMock } from '../../../../../core/server/mocks';

export const getProxyRouteHandlerDeps = ({
  proxyConfigCollection = new ProxyConfigCollection([]),
  pathFilters = [/.*/],
  readLegacyESConfig = () => ({
    requestTimeout: duration(30000),
    customHeaders: {},
    requestHeadersWhitelist: [],
    hosts: ['http://localhost:9200'],
  }),
  log = coreMock.createPluginInitializerContext().logger.get(),
}: Partial<CreateHandlerDependencies>): CreateHandlerDependencies => ({
  proxyConfigCollection,
  pathFilters,
  readLegacyESConfig,
  log,
});

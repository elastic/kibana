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

/* eslint-disable dot-notation */
import { FetcherTask } from './fetcher';
import { coreMock } from '../../../core/server/mocks';

describe('FetcherTask', () => {
  describe('sendIfDue', () => {
    it('returns undefined and warns when it fails to get telemetry configs', async () => {
      const initializerContext = coreMock.createPluginInitializerContext({});
      const fetcherTask = new FetcherTask(initializerContext);
      const mockError = new Error('Some message.');
      fetcherTask['getCurrentConfigs'] = async () => {
        throw mockError;
      };
      const result = await fetcherTask['sendIfDue']();
      expect(result).toBe(undefined);
      expect(fetcherTask['logger'].warn).toBeCalledTimes(1);
      expect(fetcherTask['logger'].warn).toHaveBeenCalledWith(
        `Error fetching telemetry configs: ${mockError}`
      );
    });
  });
});

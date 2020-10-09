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

jest.mock('@elastic/apm-rum');
import { init, apm } from '@elastic/apm-rum';
import { ApmSystem } from './apm_system';

const initMock = init as jest.Mocked<typeof init>;
const apmMock = apm as DeeplyMockedKeys<typeof apm>;

describe('ApmSystem', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.resetAllMocks();
  });

  describe('setup', () => {
    it('does not init apm if no config provided', async () => {
      const apmSystem = new ApmSystem(undefined);
      await apmSystem.setup();
      expect(initMock).not.toHaveBeenCalled();
    });

    it('calls init with configuration', async () => {
      const apmSystem = new ApmSystem({ active: true });
      await apmSystem.setup();
      expect(initMock).toHaveBeenCalledWith({ active: true });
    });

    it('adds globalLabels if provided', async () => {
      const apmSystem = new ApmSystem({ active: true, globalLabels: { alpha: 'one' } });
      await apmSystem.setup();
      expect(apm.addLabels).toHaveBeenCalledWith({ alpha: 'one' });
    });

    describe('http request normalization', () => {
      let windowSpy: any;

      beforeEach(() => {
        windowSpy = jest.spyOn(global as any, 'window', 'get').mockImplementation(() => ({
          location: {
            protocol: 'http:',
            hostname: 'mykibanadomain.com',
            port: '5601',
          },
        }));
      });

      afterEach(() => {
        windowSpy.mockRestore();
      });

      it('adds a filter function', async () => {
        const apmSystem = new ApmSystem({ active: true });
        await apmSystem.setup();
        expect(apm.addFilter).toHaveBeenCalled();
      });

      it('removes the hostname, port, and protocol only when all match window.location', async () => {
        const apmSystem = new ApmSystem({ active: true });
        await apmSystem.setup();
        const filter = apmMock.addFilter.mock.calls[0][0];
        const filteredPayload = filter({
          transactions: [
            { type: 'http-request', name: 'GET http://mykibanadomain.com:5601/asdf/qwerty' },
            { type: 'http-request', name: 'GET https://mykibanadomain.com:5601/asdf/qwerty' },
            { type: 'http-request', name: 'GET http://mykibanadomain.com:9200/asdf/qwerty' },
            { type: 'http-request', name: 'PATCH http://myotherdomain.com:5601/asdf/qwerty' },
          ],
        });

        expect(filteredPayload).toEqual({
          transactions: [
            { type: 'http-request', name: 'GET /asdf/qwerty' },
            { type: 'http-request', name: 'GET https://mykibanadomain.com:5601/asdf/qwerty' },
            { type: 'http-request', name: 'GET http://mykibanadomain.com:9200/asdf/qwerty' },
            { type: 'http-request', name: 'PATCH http://myotherdomain.com:5601/asdf/qwerty' },
          ],
        });
      });

      it('strips the basePath', async () => {
        const apmSystem = new ApmSystem({ active: true }, '/alpha');
        await apmSystem.setup();
        const filter = apmMock.addFilter.mock.calls[0][0];
        const filteredPayload = filter({
          transactions: [
            { type: 'http-request', name: 'GET http://mykibanadomain.com:5601/alpha' },
            { type: 'http-request', name: 'GET http://mykibanadomain.com:5601/alpha/' },
            { type: 'http-request', name: 'GET http://mykibanadomain.com:5601/alpha/beta' },
            { type: 'http-request', name: 'GET http://mykibanadomain.com:5601/alpha/beta/' },
          ],
        });

        expect(filteredPayload).toEqual({
          transactions: [
            { type: 'http-request', name: 'GET /' },
            { type: 'http-request', name: 'GET /' },
            { type: 'http-request', name: 'GET /beta' },
            { type: 'http-request', name: 'GET /beta/' },
          ],
        });
      });
    });
  });
});

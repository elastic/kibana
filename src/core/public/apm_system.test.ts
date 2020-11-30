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
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
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

      it('adds an observe function', async () => {
        const apmSystem = new ApmSystem({ active: true });
        await apmSystem.setup();
        expect(apm.observe).toHaveBeenCalledWith('transaction:end', expect.any(Function));
      });

      /**
       * Utility function to wrap functions that mutate their input but don't return the mutated value.
       * Makes expects easier below.
       */
      const returnArg = <T>(func: (input: T) => any): ((input: T) => T) => {
        return (input) => {
          func(input);
          return input;
        };
      };

      it('removes the hostname, port, and protocol only when all match window.location', async () => {
        const apmSystem = new ApmSystem({ active: true });
        await apmSystem.setup();
        const observer = apmMock.observe.mock.calls[0][1];
        const wrappedObserver = returnArg(observer);

        // Strips the hostname, protocol, and port from URLs that are on the same origin
        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET http://mykibanadomain.com:5601/asdf/qwerty',
          } as Transaction)
        ).toEqual({ type: 'http-request', name: 'GET /asdf/qwerty' });

        // Does not modify URLs that are not on the same origin
        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET https://mykibanadomain.com:5601/asdf/qwerty',
          } as Transaction)
        ).toEqual({
          type: 'http-request',
          name: 'GET https://mykibanadomain.com:5601/asdf/qwerty',
        });

        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET http://mykibanadomain.com:9200/asdf/qwerty',
          } as Transaction)
        ).toEqual({
          type: 'http-request',
          name: 'GET http://mykibanadomain.com:9200/asdf/qwerty',
        });

        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET http://myotherdomain.com:5601/asdf/qwerty',
          } as Transaction)
        ).toEqual({
          type: 'http-request',
          name: 'GET http://myotherdomain.com:5601/asdf/qwerty',
        });
      });

      it('strips the basePath', async () => {
        const apmSystem = new ApmSystem({ active: true }, '/alpha');
        await apmSystem.setup();
        const observer = apmMock.observe.mock.calls[0][1];
        const wrappedObserver = returnArg(observer);

        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET http://mykibanadomain.com:5601/alpha',
          } as Transaction)
        ).toEqual({ type: 'http-request', name: 'GET /' });

        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET http://mykibanadomain.com:5601/alpha/',
          } as Transaction)
        ).toEqual({ type: 'http-request', name: 'GET /' });

        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET http://mykibanadomain.com:5601/alpha/beta',
          } as Transaction)
        ).toEqual({ type: 'http-request', name: 'GET /beta' });

        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET http://mykibanadomain.com:5601/alpha/beta/',
          } as Transaction)
        ).toEqual({ type: 'http-request', name: 'GET /beta/' });

        // Works with relative URLs as well
        expect(
          wrappedObserver({
            type: 'http-request',
            name: 'GET /alpha/beta/',
          } as Transaction)
        ).toEqual({ type: 'http-request', name: 'GET /beta/' });
      });
    });
  });
});

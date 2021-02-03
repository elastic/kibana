/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

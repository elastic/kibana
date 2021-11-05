/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('@elastic/apm-rum');
import type { DeeplyMockedKeys, MockedKeys } from '@kbn/utility-types/jest';
import { init, apm } from '@elastic/apm-rum';
import { ApmSystem } from './apm_system';
import { Subject } from 'rxjs';
import { InternalApplicationStart } from './application/types';

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

    describe('manages the page load transaction', () => {
      it('does nothing if theres no transaction', async () => {
        const apmSystem = new ApmSystem({ active: true });
        const mockTransaction: MockedKeys<Transaction> = {
          type: 'wrong',
          // @ts-expect-error 2345
          block: jest.fn(),
          mark: jest.fn(),
        };
        apmMock.getCurrentTransaction.mockReturnValue(mockTransaction);
        await apmSystem.setup();
        expect(mockTransaction.mark).not.toHaveBeenCalled();
        // @ts-expect-error 2345
        expect(mockTransaction.block).not.toHaveBeenCalled();
      });

      it('blocks a page load transaction', async () => {
        const apmSystem = new ApmSystem({ active: true });
        const mockTransaction: MockedKeys<Transaction> = {
          type: 'page-load',
          // @ts-expect-error 2345
          block: jest.fn(),
          mark: jest.fn(),
        };
        apmMock.getCurrentTransaction.mockReturnValue(mockTransaction);
        await apmSystem.setup();
        expect(mockTransaction.mark).toHaveBeenCalledTimes(1);
        expect(mockTransaction.mark).toHaveBeenCalledWith('apm-setup');
        // @ts-expect-error 2345
        expect(mockTransaction.block).toHaveBeenCalledTimes(1);
      });

      it('marks apm start', async () => {
        const apmSystem = new ApmSystem({ active: true });
        const currentAppId$ = new Subject<string>();
        const mark = jest.fn();
        const mockTransaction: MockedKeys<Transaction> = {
          type: 'page-load',
          mark,
          // @ts-expect-error 2345
          block: jest.fn(),
          end: jest.fn(),
          addLabels: jest.fn(),
        };

        apmMock.getCurrentTransaction.mockReturnValue(mockTransaction);
        await apmSystem.setup();

        mark.mockReset();

        await apmSystem.start({
          application: {
            currentAppId$,
          } as any as InternalApplicationStart,
        });

        expect(mark).toHaveBeenCalledWith('apm-start');
      });

      it('closes the page load transaction once', async () => {
        const apmSystem = new ApmSystem({ active: true });
        const currentAppId$ = new Subject<string>();
        const mockTransaction: MockedKeys<Transaction> = {
          type: 'page-load',
          // @ts-expect-error 2345
          block: jest.fn(),
          mark: jest.fn(),
          end: jest.fn(),
          addLabels: jest.fn(),
        };
        apmMock.getCurrentTransaction.mockReturnValue(mockTransaction);
        await apmSystem.setup();
        await apmSystem.start({
          application: {
            currentAppId$,
          } as any as InternalApplicationStart,
        });
        currentAppId$.next('myapp');

        expect(mockTransaction.end).toHaveBeenCalledTimes(1);

        currentAppId$.next('another-app');

        expect(mockTransaction.end).toHaveBeenCalledTimes(1);
      });

      it('adds resource load labels', async () => {
        const apmSystem = new ApmSystem({ active: true });
        const currentAppId$ = new Subject<string>();
        const mockTransaction: Transaction = {
          type: 'page-load',
          // @ts-expect-error 2345
          block: jest.fn(),
          mark: jest.fn(),
          end: jest.fn(),
          addLabels: jest.fn(),
        };
        apmMock.getCurrentTransaction.mockReturnValue(mockTransaction);
        await apmSystem.setup();
        await apmSystem.start({
          application: {
            currentAppId$,
          } as any as InternalApplicationStart,
        });
        currentAppId$.next('myapp');

        expect(mockTransaction.addLabels).toHaveBeenCalledWith({
          'loaded-resources': 0,
          'cached-resources': 0,
        });
      });
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

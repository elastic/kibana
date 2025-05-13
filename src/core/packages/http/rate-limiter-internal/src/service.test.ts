/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { OnPreAuthHandler } from '@kbn/core-http-server';
import {
  httpServerMock,
  httpServiceMock,
  type InternalHttpServiceSetupMock,
} from '@kbn/core-http-server-mocks';
import { metricsServiceMock } from '@kbn/core-metrics-server-mocks';
import type { UnwrapObservable } from '@kbn/utility-types';
import { HttpRateLimiterService } from './service';

describe('HttpRateLimiterService', () => {
  let service: HttpRateLimiterService;
  let http: InternalHttpServiceSetupMock;
  let metrics: ReturnType<typeof metricsServiceMock.createInternalSetupContract>;
  let config: typeof http.rateLimiter extends Readonly<infer T> ? T : never;
  let elu$: Subject<UnwrapObservable<ReturnType<typeof metrics.getEluMetrics$>>>;

  beforeEach(() => {
    config = {} as typeof config;
    elu$ = new Subject();
    service = new HttpRateLimiterService();
    http = httpServiceMock.createInternalSetupContract();
    metrics = metricsServiceMock.createInternalSetupContract();

    http.rateLimiter = config as typeof http.rateLimiter;
    metrics.getEluMetrics$.mockReturnValue(elu$);
  });

  describe('setup', () => {
    describe('when disabled', () => {
      it('should not register a handler', () => {
        config.enabled = false;
        service.setup({ http, metrics });

        expect(http.registerOnPreAuth).not.toHaveBeenCalled();
      });
    });

    describe('when enabled', () => {
      let handler: OnPreAuthHandler;
      let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
      let response: ReturnType<typeof httpServerMock.createResponseFactory>;
      let toolkit: ReturnType<typeof httpServerMock.createToolkit>;
      const ignored = 'ignored' as unknown as ReturnType<typeof toolkit.next>;
      const throttled = 'throttled' as unknown as ReturnType<typeof response.customError>;

      beforeEach(() => {
        config.enabled = true;
        config.elu = 0.5;
        config.term = 'short';
        request = httpServerMock.createKibanaRequest();
        response = httpServerMock.createResponseFactory();
        toolkit = httpServerMock.createToolkit();

        toolkit.next.mockReturnValue(ignored);
        response.customError.mockReturnValue(throttled);

        service.setup({ http, metrics });
        [handler] = http.registerOnPreAuth.mock.lastCall!;
      });

      it('should register a handler if the rate limiter is enabled', () => {
        expect(http.registerOnPreAuth).toHaveBeenCalledWith(expect.any(Function));
      });

      it('should not throttle until started', () => {
        elu$.next({ short: 0.9, medium: 0.9, long: 0.9 });
        expect(handler(request, response, toolkit)).toBe(ignored);
      });

      it('should throttle when started', () => {
        service.start();
        elu$.next({ short: 0.9, medium: 0.9, long: 0.9 });
        expect(handler(request, response, toolkit)).toBe(throttled);
      });

      it('should not throttle when stopped', () => {
        service.start();
        service.stop();
        elu$.next({ short: 0.9, medium: 0.9, long: 0.9 });
        expect(handler(request, response, toolkit)).toBe(ignored);
      });

      it('should not throttle excluded routes', () => {
        service.start();
        elu$.next({ short: 0.9, medium: 0.9, long: 0.9 });
        expect(
          handler(
            httpServerMock.createKibanaRequest({
              kibanaRouteOptions: {
                access: 'internal',
                excludeFromRateLimiter: true,
                xsrfRequired: true,
              },
            }),
            response,
            toolkit
          )
        ).toBe(ignored);
      });

      it.each`
        threshold | term        | short  | medium | long   | expected
        ${0.6}    | ${'short'}  | ${0.5} | ${0.5} | ${0.5} | ${ignored}
        ${0.4}    | ${'short'}  | ${0.5} | ${0.5} | ${0.5} | ${throttled}
        ${0.6}    | ${'medium'} | ${0.4} | ${0.5} | ${0.6} | ${ignored}
        ${0.5}    | ${'medium'} | ${0.4} | ${0.5} | ${0.6} | ${ignored}
        ${0.4}    | ${'medium'} | ${0.4} | ${0.5} | ${0.6} | ${throttled}
        ${0.7}    | ${'long'}   | ${0.4} | ${0.5} | ${0.6} | ${ignored}
        ${0.6}    | ${'long'}   | ${0.4} | ${0.5} | ${0.6} | ${ignored}
        ${0.5}    | ${'long'}   | ${0.4} | ${0.5} | ${0.6} | ${ignored}
        ${0.4}    | ${'long'}   | ${0.4} | ${0.5} | ${0.6} | ${throttled}
      `(
        'should be $expected when the threshold is $threshold for the $term-term',
        ({ threshold, term, short, medium, long, expected }) => {
          config.elu = threshold;
          config.term = term;
          service.setup({ http, metrics });
          [handler] = http.registerOnPreAuth.mock.lastCall!;

          service.start();
          elu$.next({ short, medium, long });
          expect(handler(request, response, toolkit)).toBe(expected);
        }
      );
    });
  });
});

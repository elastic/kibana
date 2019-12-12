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

import { LogInterceptor } from './log_interceptor';

function stubClientErrorEvent(errorMeta) {
  const error = new Error();
  Object.assign(error, errorMeta);
  return {
    event: 'error',
    pid: 1234,
    timestamp: Date.now(),
    tags: ['connection', 'client', 'error'],
    error
  };
}

const stubEconnresetEvent = () => stubClientErrorEvent({ code: 'ECONNRESET' });
const stubEpipeEvent = () => stubClientErrorEvent({ errno: 'EPIPE' });
const stubEcanceledEvent = () => stubClientErrorEvent({ errno: 'ECANCELED' });

function assertDowngraded(transformed) {
  expect(!!transformed).toBe(true);
  expect(transformed).toHaveProperty('event', 'log');
  expect(transformed).toHaveProperty('tags');
  expect(transformed.tags).not.toContain('error');
}

describe('server logging LogInterceptor', () => {
  describe('#downgradeIfEconnreset()', () => {
    it('transforms ECONNRESET events', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      assertDowngraded(interceptor.downgradeIfEconnreset(event));
    });

    it('does not match if the tags are not in order', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      event.tags = [...event.tags.slice(1), event.tags[0]];
      expect(interceptor.downgradeIfEconnreset(event)).toBe(null);
    });

    it('ignores non ECONNRESET events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent({ errno: 'not ECONNRESET' });
      expect(interceptor.downgradeIfEconnreset(event)).toBe(null);
    });

    it('ignores if tags are wrong', () => {
      const interceptor = new LogInterceptor();
      const event = stubEconnresetEvent();
      event.tags = ['different', 'tags'];
      expect(interceptor.downgradeIfEconnreset(event)).toBe(null);
    });
  });

  describe('#downgradeIfEpipe()', () => {
    it('transforms EPIPE events', () => {
      const interceptor = new LogInterceptor();
      const event = stubEpipeEvent();
      assertDowngraded(interceptor.downgradeIfEpipe(event));
    });

    it('does not match if the tags are not in order', () => {
      const interceptor = new LogInterceptor();
      const event = stubEpipeEvent();
      event.tags = [...event.tags.slice(1), event.tags[0]];
      expect(interceptor.downgradeIfEpipe(event)).toBe(null);
    });

    it('ignores non EPIPE events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent({ errno: 'not EPIPE' });
      expect(interceptor.downgradeIfEpipe(event)).toBe(null);
    });

    it('ignores if tags are wrong', () => {
      const interceptor = new LogInterceptor();
      const event = stubEpipeEvent();
      event.tags = ['different', 'tags'];
      expect(interceptor.downgradeIfEpipe(event)).toBe(null);
    });
  });

  describe('#downgradeIfEcanceled()', () => {
    it('transforms ECANCELED events', () => {
      const interceptor = new LogInterceptor();
      const event = stubEcanceledEvent();
      assertDowngraded(interceptor.downgradeIfEcanceled(event));
    });

    it('does not match if the tags are not in order', () => {
      const interceptor = new LogInterceptor();
      const event = stubEcanceledEvent();
      event.tags = [...event.tags.slice(1), event.tags[0]];
      expect(interceptor.downgradeIfEcanceled(event)).toBe(null);
    });

    it('ignores non ECANCELED events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent({ errno: 'not ECANCELLED' });
      expect(interceptor.downgradeIfEcanceled(event)).toBe(null);
    });

    it('ignores if tags are wrong', () => {
      const interceptor = new LogInterceptor();
      const event = stubEcanceledEvent();
      event.tags = ['different', 'tags'];
      expect(interceptor.downgradeIfEcanceled(event)).toBe(null);
    });
  });

  describe('#downgradeIfHTTPSWhenHTTP', () => {
    it('transforms https requests when serving http errors', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent({ message: 'Parse Error', code: 'HPE_INVALID_METHOD' });
      assertDowngraded(interceptor.downgradeIfHTTPSWhenHTTP(event));
    });

    it('ignores non events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent({ message: 'Parse Error', code: 'NOT_HPE_INVALID_METHOD' });
      expect(interceptor.downgradeIfEcanceled(event)).toBe(null);
    });
  });

  describe('#downgradeIfHTTPWhenHTTPS', () => {
    it('transforms http requests when serving https errors', () => {
      const message = '40735139278848:error:1407609C:SSL routines:SSL23_GET_CLIENT_HELLO:http request:../deps/openssl/openssl/ssl/s23_srvr.c:394';
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent({ message });
      assertDowngraded(interceptor.downgradeIfHTTPWhenHTTPS(event));
    });

    it('ignores non events', () => {
      const interceptor = new LogInterceptor();
      const event = stubClientErrorEvent({ message: 'Not error' });
      expect(interceptor.downgradeIfEcanceled(event)).toBe(null);
    });
  });
});

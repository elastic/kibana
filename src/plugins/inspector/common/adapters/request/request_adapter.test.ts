/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { RequestAdapter } from './request_adapter';
import { Request } from './types';

describe('RequestAdapter', () => {
  let adapter: RequestAdapter;

  beforeEach(() => {
    adapter = new RequestAdapter();
  });

  describe('getRequests()', () => {
    function requestNames(requests: Request[]) {
      return requests.map((req) => req.name);
    }

    it('should return all started requests', () => {
      adapter.start('req1');
      adapter.start('req2');
      expect(adapter.getRequests().length).toBe(2);
      expect(requestNames(adapter.getRequests())).toEqual(['req1', 'req2']);
    });

    it('should reset when calling reset()', () => {
      adapter.start('req1');
      expect(adapter.getRequests().length).toBe(1);
      adapter.reset();
      expect(adapter.getRequests()).toEqual([]);
    });

    it('should not return requests started before reset, but finished after it', () => {
      const req = adapter.start('req1');
      expect(adapter.getRequests().length).toBe(1);
      adapter.reset();
      req.ok({ json: {} });
      expect(adapter.getRequests()).toEqual([]);
    });
  });

  describe('change events', () => {
    it('should emit it when starting a new request', () => {
      const spy = jest.fn();
      adapter.once('change', spy);
      expect(spy).not.toBeCalled();
      adapter.start('request');
      expect(spy).toBeCalled();
    });

    it('should emit it when updating the request', () => {
      const spy = jest.fn();
      adapter.on('change', spy);
      expect(spy).not.toBeCalled();
      const req = adapter.start('request');
      expect(spy).toHaveBeenCalledTimes(1);
      req.json({ my: 'request' });
      expect(spy).toHaveBeenCalledTimes(2);
      req.stats({ foo: { label: 'Foo', value: 42 }, bar: { label: 'Bar', value: 'test' } });
      expect(spy).toHaveBeenCalledTimes(3);
      req.ok({ json: {} });
      expect(spy).toHaveBeenCalledTimes(4);
    });
  });
});

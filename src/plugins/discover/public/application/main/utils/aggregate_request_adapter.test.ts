/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { AggregateRequestAdapter } from './aggregate_request_adapter';

describe('AggregateRequestAdapter', () => {
  it('should return all requests from all adapters', () => {
    const adapter1 = new RequestAdapter();
    const adapter2 = new RequestAdapter();
    const adapter3 = new RequestAdapter();
    const aggregateAdapter = new AggregateRequestAdapter([adapter1, adapter2, adapter3]);
    adapter1.start('request1');
    adapter2.start('request2');
    adapter3.start('request3');
    expect(aggregateAdapter.getRequests().map((request) => request.name)).toEqual([
      'request1',
      'request2',
      'request3',
    ]);
  });

  it('should allow adding and removing change listeners for all adapters', () => {
    const adapter1 = new RequestAdapter();
    const adapter2 = new RequestAdapter();
    const aggregateAdapter = new AggregateRequestAdapter([adapter1, adapter2]);
    const listener = jest.fn();
    aggregateAdapter.addListener('change', listener);
    adapter1.start('request1');
    adapter2.start('request2');
    expect(listener).toHaveBeenCalledTimes(2);
    aggregateAdapter.removeListener('change', listener);
    adapter1.start('request3');
    adapter2.start('request4');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

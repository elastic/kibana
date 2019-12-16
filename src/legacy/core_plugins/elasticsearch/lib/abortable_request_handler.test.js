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

import { AbortSignal } from 'abortcontroller-polyfill/dist/cjs-ponyfill';
import { abortableRequestHandler } from './abortable_request_handler';

describe('abortableRequestHandler', () => {
  jest.useFakeTimers();

  it('should call abort if disconnected', () => {
    const eventHandlers = new Map();
    const mockRequest = {
      events: {
        once: jest.fn((key, fn) => eventHandlers.set(key, fn)),
      },
    };

    const handler = jest.fn();
    const onAborted = jest.fn();
    const abortableHandler = abortableRequestHandler(handler);
    abortableHandler(mockRequest);

    const [signal, request] = handler.mock.calls[0];

    expect(signal instanceof AbortSignal).toBe(true);
    expect(request).toBe(mockRequest);

    signal.addEventListener('abort', onAborted);

    // Shouldn't be aborted or call onAborted prior to disconnecting
    expect(signal.aborted).toBe(false);
    expect(onAborted).not.toBeCalled();

    expect(eventHandlers.has('disconnect')).toBe(true);
    eventHandlers.get('disconnect')();
    jest.runAllTimers();

    // Should be aborted and call onAborted after disconnecting
    expect(signal.aborted).toBe(true);
    expect(onAborted).toBeCalled();
  });
});

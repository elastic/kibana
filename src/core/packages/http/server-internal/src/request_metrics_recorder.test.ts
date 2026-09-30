/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequestMetricsRecorder } from './request_metrics_recorder';

const attributes = {
  'http.request.method': 'GET',
  'http.route': '/api/task_manager/_heap_profile_experiment/light',
};

const createInstruments = () => ({
  activeRequests: { add: jest.fn() },
  requestDuration: { record: jest.fn() },
  requestAborted: { add: jest.fn() },
});

describe('createRequestMetricsRecorder', () => {
  it('decrements active and records duration once on normal completion', () => {
    const instruments = createInstruments();
    const recorder = createRequestMetricsRecorder(instruments);
    const request = {};

    recorder.onPostResponse(request, attributes, 0.12, 200);

    expect(instruments.activeRequests.add).toHaveBeenCalledTimes(1);
    expect(instruments.activeRequests.add).toHaveBeenCalledWith(-1, attributes);
    expect(instruments.requestDuration.record).toHaveBeenCalledTimes(1);
    expect(instruments.requestDuration.record).toHaveBeenCalledWith(0.12, {
      ...attributes,
      'http.response.status_code': 200,
    });
    expect(instruments.requestAborted.add).not.toHaveBeenCalled();
  });

  it('records aborted once when the client disconnects', () => {
    const instruments = createInstruments();
    const recorder = createRequestMetricsRecorder(instruments);
    const request = {};

    recorder.onDisconnect(request, attributes, 0.4);

    expect(instruments.requestAborted.add).toHaveBeenCalledTimes(1);
    expect(instruments.requestAborted.add).toHaveBeenCalledWith(1, attributes);
    expect(instruments.activeRequests.add).toHaveBeenCalledTimes(1);
    expect(instruments.activeRequests.add).toHaveBeenCalledWith(-1, attributes);
    expect(instruments.requestDuration.record).toHaveBeenCalledTimes(1);
    expect(instruments.requestDuration.record).toHaveBeenCalledWith(0.4, {
      ...attributes,
      'error.type': 'aborted',
    });
  });

  it('ignores a late onPostResponse after disconnect', () => {
    const instruments = createInstruments();
    const recorder = createRequestMetricsRecorder(instruments);
    const request = {};

    recorder.onDisconnect(request, attributes, 0.4);
    recorder.onPostResponse(request, attributes, 0.5, 200);

    expect(instruments.activeRequests.add).toHaveBeenCalledTimes(1);
    expect(instruments.requestDuration.record).toHaveBeenCalledTimes(1);
    expect(instruments.requestDuration.record).toHaveBeenCalledWith(0.4, {
      ...attributes,
      'error.type': 'aborted',
    });
    expect(instruments.requestAborted.add).toHaveBeenCalledTimes(1);
  });

  it('ignores a late disconnect after onPostResponse', () => {
    const instruments = createInstruments();
    const recorder = createRequestMetricsRecorder(instruments);
    const request = {};

    recorder.onPostResponse(request, attributes, 0.12, 200);
    recorder.onDisconnect(request, attributes, 0.2);

    expect(instruments.activeRequests.add).toHaveBeenCalledTimes(1);
    expect(instruments.requestDuration.record).toHaveBeenCalledTimes(1);
    expect(instruments.requestDuration.record).toHaveBeenCalledWith(0.12, {
      ...attributes,
      'http.response.status_code': 200,
    });
    expect(instruments.requestAborted.add).not.toHaveBeenCalled();
  });

  it('accounts for concurrent requests independently', () => {
    const instruments = createInstruments();
    const recorder = createRequestMetricsRecorder(instruments);
    const first = {};
    const second = {};

    recorder.onDisconnect(first, attributes, 0.3);
    recorder.onPostResponse(second, attributes, 0.1, 204);
    recorder.onPostResponse(first, attributes, 0.4, 200);

    expect(instruments.activeRequests.add).toHaveBeenCalledTimes(2);
    expect(instruments.requestDuration.record).toHaveBeenCalledTimes(2);
    expect(instruments.requestAborted.add).toHaveBeenCalledTimes(1);
  });
});

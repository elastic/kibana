/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mockGetMeter,
  mockCreateCounter,
  mockCreateHistogram,
  getCounterAdd,
  getHistogramRecord,
} from './instrumented_exporter.test.mocks';

import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { InstrumentedExporter } from './instrumented_exporter';

const RECORDS_EXPORTED = 'kibana.logging.otel_appender.records.exported';
const EXPORT_DURATION = 'kibana.logging.otel_appender.export.duration';

type ExportCallback = Parameters<LogRecordExporter['export']>[1];
type ExportResult = Parameters<ExportCallback>[0];

const makeFakeLogs = (n: number): ReadableLogRecord[] =>
  Array.from({ length: n }, () => ({} as ReadableLogRecord));

const makeError = (name: string): Error => Object.assign(new Error(name), { name });

describe('InstrumentedExporter — module setup', () => {
  it('acquires the kibana.logging.otel_appender meter scope', () => {
    expect(mockGetMeter).toHaveBeenCalledWith('kibana.logging.otel_appender');
  });

  it('declares records.exported counter with a fully-qualified name and {record} unit', () => {
    expect(mockCreateCounter).toHaveBeenCalledWith(
      'kibana.logging.otel_appender.records.exported',
      expect.objectContaining({ unit: '{record}' })
    );
  });

  it('declares export.duration histogram with a fully-qualified name and ms unit', () => {
    expect(mockCreateHistogram).toHaveBeenCalledWith(
      'kibana.logging.otel_appender.export.duration',
      expect.objectContaining({ unit: 'ms' })
    );
  });
});

describe('InstrumentedExporter', () => {
  let underlyingExport: jest.Mock;
  let underlyingShutdown: jest.Mock;
  let underlying: LogRecordExporter;
  let consoleErrorSpy: jest.SpyInstance;

  const fireCallback = (result: ExportResult) => {
    const lastCall = underlyingExport.mock.calls.at(-1);
    if (!lastCall) throw new Error('underlying.export was not called');
    const cb: ExportCallback = lastCall[1];
    cb(result);
  };

  beforeEach(() => {
    underlyingExport = jest.fn();
    underlyingShutdown = jest.fn().mockResolvedValue(undefined);
    underlying = { export: underlyingExport, shutdown: underlyingShutdown };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getCounterAdd(RECORDS_EXPORTED)?.mockClear();
    getHistogramRecord(EXPORT_DURATION)?.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('delegates export() to the underlying exporter with the original batch', () => {
    const wrapper = new InstrumentedExporter(underlying, 'proto');
    const logs = makeFakeLogs(2);
    wrapper.export(logs, jest.fn());
    expect(underlyingExport).toHaveBeenCalledWith(logs, expect.any(Function));
  });

  it('forwards the underlying result to the caller-supplied callback', () => {
    const wrapper = new InstrumentedExporter(underlying, 'proto');
    const cb = jest.fn();
    wrapper.export(makeFakeLogs(1), cb);
    const result: ExportResult = { code: 0 };
    fireCallback(result);
    expect(cb).toHaveBeenCalledWith(result);
  });

  describe('on success', () => {
    it('increments records.exported by batch size with outcome=success, the configured protocol, and error.type=none', () => {
      const wrapper = new InstrumentedExporter(underlying, 'http');
      wrapper.export(makeFakeLogs(5), jest.fn());
      fireCallback({ code: 0 });

      expect(getCounterAdd(RECORDS_EXPORTED)).toHaveBeenCalledWith(5, {
        outcome: 'success',
        'otel.exporter.protocol': 'http',
        'error.type': 'none',
      });
    });

    it('records export.duration with the same attributes (including error.type=none)', () => {
      const wrapper = new InstrumentedExporter(underlying, 'grpc');
      wrapper.export(makeFakeLogs(1), jest.fn());
      fireCallback({ code: 0 });

      expect(getHistogramRecord(EXPORT_DURATION)).toHaveBeenCalledWith(expect.any(Number), {
        outcome: 'success',
        'otel.exporter.protocol': 'grpc',
        'error.type': 'none',
      });
    });

    it('does not emit console.error', () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      wrapper.export(makeFakeLogs(1), jest.fn());
      fireCallback({ code: 0 });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('on failure', () => {
    it('increments records.exported with outcome=failure and error.type from the error name', () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      wrapper.export(makeFakeLogs(3), jest.fn());
      fireCallback({ code: 1, error: makeError('NetworkError') });

      expect(getCounterAdd(RECORDS_EXPORTED)).toHaveBeenCalledWith(3, {
        outcome: 'failure',
        'otel.exporter.protocol': 'proto',
        'error.type': 'NetworkError',
      });
    });

    it('records export.duration with the failure attributes', () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      wrapper.export(makeFakeLogs(1), jest.fn());
      fireCallback({ code: 1, error: makeError('TimeoutError') });

      expect(getHistogramRecord(EXPORT_DURATION)).toHaveBeenCalledWith(expect.any(Number), {
        outcome: 'failure',
        'otel.exporter.protocol': 'proto',
        'error.type': 'TimeoutError',
      });
    });

    it('falls back to error.type="unknown" when the result has no error object', () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      wrapper.export(makeFakeLogs(1), jest.fn());
      fireCallback({ code: 1 });

      expect(getCounterAdd(RECORDS_EXPORTED)).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ 'error.type': 'unknown' })
      );
    });

    it('emits a console.error containing errorType, batchSize, and protocol', () => {
      const wrapper = new InstrumentedExporter(underlying, 'http');
      wrapper.export(makeFakeLogs(7), jest.fn());
      fireCallback({ code: 1, error: makeError('TimeoutError') });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const message = consoleErrorSpy.mock.calls[0][0];
      expect(message).toContain('errorType=TimeoutError');
      expect(message).toContain('batchSize=7');
      expect(message).toContain('protocol=http');
    });

    it('still forwards the original result to the caller-supplied callback on failure', () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      const cb = jest.fn();
      wrapper.export(makeFakeLogs(1), cb);
      const result: ExportResult = { code: 1, error: makeError('NetworkError') };
      fireCallback(result);
      expect(cb).toHaveBeenCalledWith(result);
    });

    describe('rate-limited console.error', () => {
      beforeEach(() => {
        // Modern fake timers also fake performance.now (used by the rate
        // limiter). Advance time via jest.advanceTimersByTime, not setSystemTime.
        jest.useFakeTimers();
      });
      afterEach(() => {
        jest.useRealTimers();
      });

      const failWith = (wrapper: InstrumentedExporter, name: string) => {
        wrapper.export(makeFakeLogs(1), jest.fn());
        fireCallback({ code: 1, error: makeError(name) });
      };

      it('suppresses repeats for the same error.type within the 30s window', () => {
        const wrapper = new InstrumentedExporter(underlying, 'proto');
        failWith(wrapper, 'NetworkError');
        jest.advanceTimersByTime(10_000);
        failWith(wrapper, 'NetworkError');
        jest.advanceTimersByTime(19_999);
        failWith(wrapper, 'NetworkError');

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      });

      it('emits again once the 30s window has elapsed for the same error.type', () => {
        const wrapper = new InstrumentedExporter(underlying, 'proto');
        failWith(wrapper, 'NetworkError');
        jest.advanceTimersByTime(30_000);
        failWith(wrapper, 'NetworkError');

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      });

      it('treats different error.type values as independent rate-limit buckets', () => {
        const wrapper = new InstrumentedExporter(underlying, 'proto');
        failWith(wrapper, 'NetworkError');
        failWith(wrapper, 'AuthError');

        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('idempotent result callback', () => {
    it('does not double-count metrics if the underlying exporter invokes the result callback twice', () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      const cb = jest.fn();
      wrapper.export(makeFakeLogs(4), cb);
      fireCallback({ code: 0 });
      fireCallback({ code: 0 });

      expect(getCounterAdd(RECORDS_EXPORTED)).toHaveBeenCalledTimes(1);
      expect(getCounterAdd(RECORDS_EXPORTED)).toHaveBeenCalledWith(4, expect.any(Object));
      expect(getHistogramRecord(EXPORT_DURATION)).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not re-fire the rate-limited warn if a failure callback is invoked twice', () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      wrapper.export(makeFakeLogs(1), jest.fn());
      const failure = { code: 1, error: makeError('NetworkError') };
      fireCallback(failure);
      fireCallback(failure);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('shutdown', () => {
    it('delegates to the underlying exporter', async () => {
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      await wrapper.shutdown();
      expect(underlyingShutdown).toHaveBeenCalledTimes(1);
    });

    it('propagates the underlying shutdown rejection', async () => {
      underlyingShutdown.mockRejectedValueOnce(new Error('boom'));
      const wrapper = new InstrumentedExporter(underlying, 'proto');
      await expect(wrapper.shutdown()).rejects.toThrow('boom');
    });
  });
});

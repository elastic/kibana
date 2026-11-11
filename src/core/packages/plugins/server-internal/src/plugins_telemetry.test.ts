/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/tracing-utils', () => {
  const actual = jest.requireActual('@kbn/tracing-utils');
  return { ...actual, withActiveSpan: jest.fn(actual.withActiveSpan) };
});

import { of } from 'rxjs';
import { metrics, type Meter } from '@opentelemetry/api';
import { withActiveSpan } from '@kbn/tracing-utils';
import type { PluginWrapper } from './plugin';
import { PluginsTelemetry } from './plugins_telemetry';

const plugin = { name: 'pluginA', source: 'x-pack' } as PluginWrapper;
const pluginAttributes = { 'kibana.plugin.id': 'pluginA' };

describe('PluginsTelemetry', () => {
  let histograms: Map<string, { record: jest.Mock }>;
  let telemetry: PluginsTelemetry;

  const recordsOf = (name: string) => histograms.get(name)?.record.mock.calls ?? [];
  const lifecycleRecords = () => recordsOf('kibana.plugins.lifecycle.duration');

  beforeEach(() => {
    histograms = new Map();
    jest.spyOn(metrics, 'getMeter').mockReturnValue({
      createHistogram: jest.fn((name: string) => {
        const histogram = { record: jest.fn() };
        histograms.set(name, histogram);
        return histogram;
      }),
    } as unknown as Meter);
    telemetry = new PluginsTelemetry();
  });

  afterEach(() => {
    jest.mocked(metrics.getMeter).mockRestore();
    jest.mocked(withActiveSpan).mockClear();
  });

  describe('#measure', () => {
    it('returns a synchronous value unchanged and records a successful duration', () => {
      const contract = { foo: 'bar' };

      expect(telemetry.measure(plugin, 'setup', () => contract)).toBe(contract);
      expect(withActiveSpan).toHaveBeenCalledWith(
        'kibana.plugin.setup',
        { attributes: pluginAttributes },
        expect.any(Function)
      );
      expect(lifecycleRecords()).toEqual([
        [
          expect.any(Number),
          { ...pluginAttributes, 'kibana.plugin.lifecycle': 'setup', outcome: 'success' },
        ],
      ]);
    });

    it('returns an observable contract as the same instance', () => {
      const contract = of(1);

      expect(telemetry.measure(plugin, 'start', () => contract)).toBe(contract);
    });

    it('records the duration of a returned promise once it resolves', async () => {
      const { promise, resolve } = Promise.withResolvers<string>();

      const measured = telemetry.measure(plugin, 'start', () => promise);
      expect(lifecycleRecords()).toEqual([]);

      resolve('contract');
      await expect(measured).resolves.toBe('contract');
      expect(lifecycleRecords()).toEqual([
        [
          expect.any(Number),
          { ...pluginAttributes, 'kibana.plugin.lifecycle': 'start', outcome: 'success' },
        ],
      ]);
    });

    it('rethrows a rejection and records a failed duration', async () => {
      const error = new Error('boom');

      await expect(telemetry.measure(plugin, 'start', () => Promise.reject(error))).rejects.toBe(
        error
      );
      expect(lifecycleRecords()).toEqual([
        [
          expect.any(Number),
          { ...pluginAttributes, 'kibana.plugin.lifecycle': 'start', outcome: 'failure' },
        ],
      ]);
    });

    it('rethrows a synchronous throw and records a failed duration', () => {
      const error = new Error('boom');

      expect(() =>
        telemetry.measure(plugin, 'setup', () => {
          throw error;
        })
      ).toThrow(error);
      expect(lifecycleRecords()).toEqual([
        [
          expect.any(Number),
          { ...pluginAttributes, 'kibana.plugin.lifecycle': 'setup', outcome: 'failure' },
        ],
      ]);
    });
  });

  describe('#measureInitialize', () => {
    it('records the duration and the process uptime once initialize() succeeds', async () => {
      const uptime = jest.spyOn(process, 'uptime').mockReturnValue(42);

      await telemetry.measureInitialize(plugin, () => Promise.resolve());
      uptime.mockRestore();

      expect(withActiveSpan).toHaveBeenCalledWith(
        'kibana.plugin.initialize',
        { attributes: pluginAttributes },
        expect.any(Function)
      );
      expect(lifecycleRecords()).toEqual([
        [
          expect.any(Number),
          { ...pluginAttributes, 'kibana.plugin.lifecycle': 'initialize', outcome: 'success' },
        ],
      ]);
      expect(recordsOf('kibana.plugins.initialize.time_to_available')).toEqual([
        [42, pluginAttributes],
      ]);
    });

    it('records no time to available when initialize() fails', async () => {
      const error = new Error('boom');

      await expect(telemetry.measureInitialize(plugin, () => Promise.reject(error))).rejects.toBe(
        error
      );
      expect(lifecycleRecords()).toEqual([
        [
          expect.any(Number),
          { ...pluginAttributes, 'kibana.plugin.lifecycle': 'initialize', outcome: 'failure' },
        ],
      ]);
      expect(recordsOf('kibana.plugins.initialize.time_to_available')).toEqual([]);
    });
  });
});

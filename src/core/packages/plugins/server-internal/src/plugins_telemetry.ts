/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType, type Histogram } from '@opentelemetry/api';
import { isPromise } from '@kbn/std';
import { withActiveSpan } from '@kbn/tracing-utils';
import type { PluginWrapper } from './plugin';

const METER_NAME = 'kibana.plugins';

/** The plugin lifecycle calls core measures. */
export type PluginLifecycle = 'setup' | 'start' | 'initialize';

type Outcome = 'success' | 'failure';

interface Boxed<T> {
  readonly value: T;
}

const toAttributes = ({ name, source }: PluginWrapper) => ({
  'kibana.plugin.id': name,
  'kibana.plugin.source': source,
});

/**
 * Records a span and a duration for every plugin `setup()`, `start()` and `initialize()` call,
 * and the process uptime at which each plugin's `initialize()` succeeded.
 *
 * @internal
 */
export class PluginsTelemetry {
  private readonly lifecycleDuration: Histogram;
  private readonly timeToAvailable: Histogram;

  constructor() {
    const meter = metrics.getMeter(METER_NAME);
    this.lifecycleDuration = meter.createHistogram('kibana.plugins.lifecycle.duration', {
      description:
        'Duration of each plugin lifecycle call (refer to attribute "kibana.plugin.lifecycle").',
      unit: 's',
      valueType: ValueType.DOUBLE,
    });
    this.timeToAvailable = meter.createHistogram('kibana.plugins.initialize.time_to_available', {
      description: "Process uptime when a plugin's initialize() succeeded.",
      unit: 's',
      valueType: ValueType.DOUBLE,
    });
  }

  /**
   * Runs one lifecycle call inside a `kibana.plugin.<lifecycle>` span and records its duration. A
   * returned promise is measured until it settles. The returned value is passed through unchanged.
   */
  public measure<T>(
    plugin: PluginWrapper,
    lifecycle: PluginLifecycle,
    run: () => T | Promise<T>
  ): T | Promise<T> {
    const attributes = toAttributes(plugin);
    const startedAt = performance.now();
    const record = (outcome: Outcome): void =>
      this.lifecycleDuration.record((performance.now() - startedAt) / 1000, {
        ...attributes,
        'kibana.plugin.lifecycle': lifecycle,
        outcome,
      });

    try {
      // Boxed so the span helper never inspects the contract: it would wrap an observable one.
      const boxed = withActiveSpan(
        `kibana.plugin.${lifecycle}`,
        { attributes },
        (): Boxed<T> | Promise<Boxed<T>> => {
          const result = run();
          return isPromise(result) ? result.then((value) => ({ value })) : { value: result };
        }
      );
      if (isPromise(boxed)) {
        return boxed.then(
          ({ value }) => {
            record('success');
            return value;
          },
          (error: unknown) => {
            record('failure');
            throw error;
          }
        );
      }
      record('success');
      return boxed.value;
    } catch (error) {
      record('failure');
      throw error;
    }
  }

  /** {@link measure} for `initialize()`, also recording when the plugin became available. */
  public async measureInitialize(plugin: PluginWrapper, run: () => Promise<void>): Promise<void> {
    await this.measure(plugin, 'initialize', run);
    this.timeToAvailable.record(process.uptime(), toAttributes(plugin));
  }
}

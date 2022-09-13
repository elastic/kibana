/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScenarioOptions } from './utils/get_scenario_options';
import { SignalIterable } from '../lib/streaming/signal_iterable';
import { Signal } from '../dsl/signal';
import { WriteTarget } from '../dsl/write_target';
import { Fields } from '../dsl/fields';
import { StreamAggregator } from '../lib/streaming/stream_aggregator';
import { BufferedAggregator } from '../lib/streaming/stream_processor';

type Generate<TFields> = (range: { from: Date; to: Date }) => SignalIterable<TFields>;
export interface ScenarioDescriptor<TFields extends Fields> {
  /**
   * Sets up the generation of signal's based on the from and to specified to the callback
   */
  generate: Generate<TFields>;
  /**
   * Declare which write target this scenario will write too. This is used primarily to know
   * how to clean up before attempting to write this scenario
   */
  writeTargets: WriteTarget[];
  /**
   * Deprecated: a set of processors that take the local buffer and emit new summaries into the event stream
   */
  processors?: Array<BufferedAggregator<TFields>>;
  /**
   * Set of StreamAggregators that create summaries through receiving one signal at a time and emitting summaries
   * back into the stream after a certain period or max buckets.
   */
  streamAggregators?: Array<StreamAggregator<TFields, TFields>>;
  /**
   * A way for a scenario to override the default Signal's write target.
   */
  mapToIndex?: (data: Signal<TFields>) => WriteTarget | undefined;
}
export type Scenario<TFields> = (options: ScenarioOptions) => Promise<ScenarioDescriptor<TFields>>;

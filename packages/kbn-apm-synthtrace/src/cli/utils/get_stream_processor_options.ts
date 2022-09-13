/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../../dsl/fields';
import { StreamProcessorOptions } from '../../lib/streaming/stream_processor';
import { Logger } from '../../lib/utils/create_logger';
import { ScenarioDescriptor } from '../scenario';
import { ScenarioOptions } from './get_scenario_options';

export function getStreamProcessorOptions(
  name: string,
  logger: Logger,
  version: string,
  options: ScenarioOptions,
  scenario: ScenarioDescriptor<Fields>
): StreamProcessorOptions<Fields> {
  return {
    name,
    version,
    logger,
    maxSourceEvents: options.maxDocs,
    processors: options.apm ? [] : scenario.processors,
    streamAggregators: options.apm ? [] : scenario.streamAggregators,
  };
}

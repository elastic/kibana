/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '../../lib/utils/create_logger';
import { Scenario } from '../scenario';
import { Fields } from '../../dsl/fields';
import { ScenarioOptions } from './get_scenario_options';

export async function getScenario({
  logger,
  options,
}: {
  logger: Logger;
  options: ScenarioOptions;
}) {
  const file = options.file;
  logger.debug(`Loading scenario from ${file}`);

  const scenario = await (import(file).then((m) => {
    if (m && m.default) {
      return m.default;
    }
    throw new Error(`Could not import scenario at ${file}`);
  }) as Promise<Scenario<Fields>>);
  return await scenario(options);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '@kbn/apm-synthtrace-client';
import { Logger } from '../../lib/utils/create_logger';
import { Scenario } from '../scenario';

export function getScenario({ file, logger }: { file: string; logger: Logger }) {
  logger.debug(`Loading scenario from ${file}`);

  return import(file).then((m) => {
    if (m && m.default) {
      return m.default;
    }
    throw new Error(`Could not import scenario at ${file}`);
  }) as Promise<Scenario<Fields>>;
}

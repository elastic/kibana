/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Path from 'path';
import { Logger } from '../../lib/utils/create_logger';
import { Scenario } from '../scenario';
import { Fields } from '../../lib/entity';

export function getScenario({ file, logger }: { file: unknown; logger: Logger }) {
  const location = Path.join(process.cwd(), String(file));

  logger.debug(`Loading scenario from ${location}`);

  return import(location).then((m) => {
    if (m && m.default) {
      return m.default;
    }
    throw new Error(`Could not find scenario at ${location}`);
  }) as Promise<Scenario<Fields>>;
}

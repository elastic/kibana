/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import path from 'path';
import { Fields } from '../../lib/entity';
import { Logger } from '../../lib/utils/create_logger';

export type Scenario = (options: { from: number; to: number }) => Fields[];

export function getScenario({ file, logger }: { file: string; logger: Logger }) {
  const location = path.resolve(file);
  logger.debug(`Loading scenario from ${location}`);

  return import(location).then((m) => {
    if (m && m.default) {
      return m.default;
    }
    throw new Error(`Could not find scenario at ${location}`);
  }) as Promise<Scenario>;
}

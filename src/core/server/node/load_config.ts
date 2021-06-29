/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { RawConfigService } from '../config';
import { NodeConfigType, config } from './node_config';

export const loadNodeConfig = async (
  rawConfigService: RawConfigService
): Promise<NodeConfigType> => {
  const rawConfig = await rawConfigService.getConfig$().pipe(take(1)).toPromise();
  return config.schema.validate(rawConfig[config.path]);
};

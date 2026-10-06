/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PathConfigType } from '@kbn/utils';
import type { Logger } from '@kbn/logging';
import type { HttpConfigType } from './types';
/**
 * This UUID was inadvertently shipped in the 7.6.0 distributable and should be deleted if found.
 * See https://github.com/elastic/kibana/issues/57673 for more info.
 */
export declare const UUID_7_6_0_BUG = 'ce42b997-a913-4d58-be46-bb1937feedd6';
export declare function resolveInstanceUuid({
  pathConfig,
  serverConfig,
  logger,
}: {
  pathConfig: PathConfigType;
  serverConfig: HttpConfigType;
  logger: Logger;
}): Promise<string>;

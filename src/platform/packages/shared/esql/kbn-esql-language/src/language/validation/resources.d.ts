/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ESQLPolicy } from '../../commands/registry/types';
export declare function retrievePolicies(
  commands: ESQLAstAllCommands[],
  callbacks?: ESQLCallbacks
): Promise<Map<string, ESQLPolicy>>;
export declare function retrieveSources(
  commands: ESQLAstAllCommands[],
  callbacks?: ESQLCallbacks
): Promise<Set<string>>;

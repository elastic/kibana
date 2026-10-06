/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
export interface MigratorConfig {
  /** The index prefix for this migrator. e.g '.kibana' */
  indexPrefix: string;
  /** The id of the types this migrator is in charge of */
  types: string[];
}
export declare const buildMigratorConfigs: ({
  typeRegistry,
  kibanaIndexPrefix,
}: {
  typeRegistry: ISavedObjectTypeRegistry;
  kibanaIndexPrefix: string;
}) => MigratorConfig[];

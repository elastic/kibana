/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import type { GetDeprecationsContext } from '@kbn/core-deprecations-server';
import type { DeprecationsRegistry } from './deprecations_registry';
export interface DeprecationsFactoryDeps {
  logger: Logger;
  config: DeprecationsFactoryConfig;
}
export interface DeprecationsFactoryConfig {
  ignoredConfigDeprecations: string[];
}
export declare class DeprecationsFactory {
  private readonly registries;
  private readonly logger;
  private readonly config;
  constructor({ logger, config }: DeprecationsFactoryDeps);
  getRegistry: (domainId: string) => DeprecationsRegistry;
  getDeprecations: (
    domainId: string,
    dependencies: GetDeprecationsContext
  ) => Promise<DomainDeprecationDetails[]>;
  getAllDeprecations: (dependencies: GetDeprecationsContext) => Promise<DomainDeprecationDetails[]>;
  private createDeprecationInfo;
  private getDeprecationsBody;
}

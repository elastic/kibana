/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { AnalyticsServicePreboot } from '@kbn/core-analytics-server';
/**
 * @internal
 */
export interface EnvironmentServicePrebootDeps {
  /**
   * {@link AnalyticsServicePreboot}
   */
  analytics: AnalyticsServicePreboot;
}
/**
 * @internal
 */
export interface InternalEnvironmentServicePreboot {
  /**
   * Retrieve the Kibana instance uuid.
   */
  instanceUuid: string;
}
/**
 * @internal
 */
export type InternalEnvironmentServiceSetup = InternalEnvironmentServicePreboot;
/** @internal */
export declare class EnvironmentService {
  private readonly log;
  private readonly configService;
  private uuid;
  constructor(core: CoreContext);
  preboot({ analytics }: EnvironmentServicePrebootDeps): Promise<{
    instanceUuid: string;
  }>;
  setup(): {
    instanceUuid: string;
  };
}

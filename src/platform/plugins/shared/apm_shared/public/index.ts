/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { ApmSharedPlugin } from './plugin';

export const plugin = (_initContext: PluginInitializerContext) => new ApmSharedPlugin();

export type { ApmSharedPluginSetup, ApmSharedPluginStart } from './types';

/** Use with `feature_flags.overrides` in kibana.yml to toggle CPS integration for APM. */
export const OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG = 'observability.apm.cpsEnabled' as const;

/**
 * Fallback when the flag is unset and no override exists (same default as the removed
 * `xpack.apm.featureFlags.apmCPSEnabled` setting).
 */
export const OBSERVABILITY_APM_CPS_ENABLED_DEFAULT = true;

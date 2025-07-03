/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  KIBANA_SOLUTIONS,
  KIBANA_CHAT_SOLUTION,
  KIBANA_OBSERVABILITY_SOLUTION,
  KIBANA_SEARCH_SOLUTION,
  KIBANA_SECURITY_SOLUTION,
  KIBANA_PRODUCT_TIERS,
  KIBANA_OBSERVABILITY_COMPLETE_TIER,
  KIBANA_OBSERVABILITY_LOGS_ESSENTIALS_TIER,
  KIBANA_SECURITY_COMPLETE_TIER,
  KIBANA_SECURITY_ESSENTIALS_TIER,
  KIBANA_SECURITY_SEARCH_AI_LAKE_TIER,
  type KibanaSolution,
  type KibanaProductTier,
} from './src/solutions';

export {
  KIBANA_GROUPS,
  KIBANA_PLATFORM,
  type KibanaGroup,
  type ModuleGroup,
  type ModuleVisibility,
} from './src/module_groups';

export {
  KIBANA_PROJECTS,
  KIBANA_CHAT_PROJECT,
  KIBANA_OBSERVABILITY_PROJECT,
  KIBANA_SEARCH_PROJECT,
  KIBANA_SECURITY_PROJECT,
  type KibanaProject,
} from './src/project_types';

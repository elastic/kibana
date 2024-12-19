/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  /**
   * Synchronized regex list of files that use `styled-components`.
   * Used by `kbn-babel-preset` and `kbn-eslint-config`.
   */
  USES_STYLED_COMPONENTS: [
    /packages[\/\\]kbn-ui-shared-deps-npm[\/\\]/,
    /packages[\/\\]kbn-ui-shared-deps-src[\/\\]/,
    /src[\/\\]plugins[\/\\]kibana_react[\/\\]/,
    /x-pack[\/\\]platform[\/\\]packages[\/\\]shared[\/\\]kbn-elastic-assistant[\/\\]/,
    /x-pack[\/\\]plugins[\/\\]fleet[\/\\]/,
    /x-pack[\/\\]plugins[\/\\]observability_solution[\/\\]observability_shared[\/\\]/,
    /x-pack[\/\\]plugins[\/\\]security_solution[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]exploratory_view[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]investigate_app[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]investigate[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]observability_ai_assistant_app[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]observability_ai_assistant_management[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]observability_solution[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]observability[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]serverless_observability[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]streams_app[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]streams[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]synthetics[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]uptime[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]observability[\/\\]plugins[\/\\]ux[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]security[\/\\]packages[\/\\]ecs_data_quality_dashboard[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]security[\/\\]plugins[\/\\]lists[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]security[\/\\]plugins[\/\\]security_solution[\/\\]/,
    /x-pack[\/\\]solutions[\/\\]security[\/\\]plugins[\/\\]timelines[\/\\]/,
    /x-pack[\/\\]test[\/\\]plugin_functional[\/\\]plugins[\/\\]resolver_test[\/\\]/,
  ],
};

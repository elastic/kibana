/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  /**
   * Synchronized regex list of files that use `styled-components`.
   * Used by `kbn-babel-preset` and `kbn-eslint-config`.
   */
  USES_STYLED_COMPONENTS: [
    /packages[\/\\]kbn-ui-shared-deps-(npm|src)[\/\\]/,
    /src[\/\\]plugins[\/\\](kibana_react)[\/\\]/,
    /x-pack[\/\\]plugins[\/\\](apm|beats_management|cases|fleet|infra|lists|observability|observability_solution\/observability_shared|observability_solution\/exploratory_view|security_solution|timelines|synthetics|observability_solution\/ux|uptime)[\/\\]/,
    /x-pack[\/\\]test[\/\\]plugin_functional[\/\\]plugins[\/\\]resolver_test[\/\\]/,
    /x-pack[\/\\]packages[\/\\]elastic_assistant[\/\\]/,
    /x-pack[\/\\]packages[\/\\]security-solution[\/\\]ecs_data_quality_dashboard[\/\\]/,
  ],
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { Workflows } from '@kbn/core-chrome-browser';

import { getWorkflow as getSearchWorkflow } from './search';
import { getWorkflow as getObservabilityWorkflow } from './observability';
import { getWorkflow as getSecurityWorkflow } from './security';

export interface WorkflowDeps {
  core: CoreStart;
  serverless: ServerlessPluginStart;
  cloud: CloudStart;
}

export const getWorkflows = (deps: WorkflowDeps): Workflows => {
  return {
    search: getSearchWorkflow(deps),
    observability: getObservabilityWorkflow(deps),
    security: getSecurityWorkflow(deps),
    classic: {
      id: 'classic',
      title: 'Classic',
      style: 'classic',
      icon: 'logoKibana',
      isDefault: true,
    },
  };
};

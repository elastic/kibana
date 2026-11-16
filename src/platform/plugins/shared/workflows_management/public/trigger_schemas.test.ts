/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import { triggerSchemas } from './trigger_schemas';

describe('triggerSchemas.getTriggerSchemaOptions', () => {
  const extensions = {} as WorkflowsExtensionsPublicPluginStart;

  it('includes the page trigger only with workflowsManagement.pages.enabled', () => {
    triggerSchemas.initialize(extensions);
    expect(triggerSchemas.getTriggerSchemaOptions()).toEqual({ includePageTrigger: false });

    triggerSchemas.initialize(extensions, { pagesEnabled: true });
    expect(triggerSchemas.getTriggerSchemaOptions()).toEqual({ includePageTrigger: true });
  });
});

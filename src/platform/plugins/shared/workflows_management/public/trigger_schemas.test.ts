/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { FeatureFlagsStart } from '@kbn/core/public';
import { WORKFLOWS_PAGES_ENABLED_FLAG } from '@kbn/workflows';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import { triggerSchemas } from './trigger_schemas';

describe('triggerSchemas.getTriggerSchemaOptions', () => {
  const extensions = {} as WorkflowsExtensionsPublicPluginStart;

  it('follows the workflows.pages.enabled feature flag', () => {
    const pagesEnabled$ = new BehaviorSubject(false);
    const getBooleanValue$ = jest.fn(() => pagesEnabled$);
    triggerSchemas.initialize(extensions, { getBooleanValue$ } as unknown as FeatureFlagsStart);

    expect(getBooleanValue$).toHaveBeenCalledWith(WORKFLOWS_PAGES_ENABLED_FLAG, false);
    expect(triggerSchemas.getTriggerSchemaOptions()).toEqual({ includePageTrigger: false });

    pagesEnabled$.next(true);

    expect(triggerSchemas.getTriggerSchemaOptions()).toEqual({ includePageTrigger: true });
  });
});

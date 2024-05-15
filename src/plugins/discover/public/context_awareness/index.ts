/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getMergedAccessor, Profile } from './composable_profile';
import { documentProfileService, rootProfileService } from './profiles';

export { useContextAwareness } from './use_context_awareness';

const rootProfile = rootProfileService.resolve();
const dataSourceProfile = rootProfileService.resolve();
const documentProfile = documentProfileService.resolve();

const baseProfile: Profile = {
  getTopNavItems: (count: number) => [],
  getDefaultColumns: () => [],
  getFlyout: () => null,
};

const res = getMergedAccessor(
  'getFlyout',
  baseProfile
)([rootProfile, dataSourceProfile, documentProfile]);

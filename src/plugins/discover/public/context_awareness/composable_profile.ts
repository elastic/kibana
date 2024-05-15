/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { CustomCellRenderer } from '@kbn/unified-data-table';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';

export interface Profile {
  getTopNavItems: () => TopNavMenuData[];
  getCellRenderers: () => CustomCellRenderer;
  getDocViewsRegistry: (prevRegistry: DocViewsRegistry) => DocViewsRegistry;
}

export type PartialProfile = Partial<Profile>;

export type ComposableAccessor<T> = (getPrevious: T) => T;

export type ComposableProfile<TProfile extends PartialProfile = Profile> = {
  [TKey in keyof TProfile]?: ComposableAccessor<TProfile[TKey]>;
};

export const getMergedAccessor = <TKey extends keyof Profile>(
  profiles: ComposableProfile[],
  key: TKey,
  baseImpl: Profile[TKey]
) => {
  return profiles.reduce((nextAccessor, profile) => {
    const currentAccessor = profile[key];
    return currentAccessor ? currentAccessor(nextAccessor) : nextAccessor;
  }, baseImpl);
};

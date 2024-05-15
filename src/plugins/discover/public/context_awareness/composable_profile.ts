/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TopNavMenuData } from '@kbn/navigation-plugin/public';

export interface Profile {
  getTopNavItems: () => TopNavMenuData[];
  getDefaultColumns: () => Column[];
  getFlyout: () => FlyoutComponent;
}

export type PartialProfile = Partial<Profile>;

export type ComposableAccessor<T> = (getPrevious: T) => T;

export type ComposableProfile<TProfile extends PartialProfile = Profile> = {
  [TKey in keyof TProfile]?: ComposableAccessor<TProfile[TKey]>;
};

export const getMergedAccessor = <TKey extends keyof Profile>(
  profiles: ComposableProfile[],
  key: TKey,
  defaultImplementation: Profile[TKey]
) => {
  return profiles.reduce((nextAccessor, profile) => {
    const currentAccessor = profile[key];
    return currentAccessor ? currentAccessor(nextAccessor) : nextAccessor;
  }, defaultImplementation);
};

// placeholders

interface TopNavItem {
  __brand: 'TopNavItem';
  name: string;
}

interface Column {
  __brand: 'Columns';
  name: string;
}

interface FlyoutComponent {
  __brand: 'FlyoutComponent';
  name: string;
}

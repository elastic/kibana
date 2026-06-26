/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  UserStorageProvider,
  useUserStorage,
  type IUserStorageClient,
} from '@kbn/core-user-storage-browser';

const StringKeyValue = () => {
  const [preloadedStringValue] = useUserStorage<string>('test:string_key');
  const [lazyStringValue] = useUserStorage<string>('test:string_key_lazy');
  return (
    <>
      <div data-test-subj="userStorageTest:string-key-row">
        <span>String key (preloaded): </span>
        <span data-test-subj="userStorageTest:string-key-value">{preloadedStringValue}</span>
      </div>
      <div data-test-subj="userStorageTest:lazy-string-key-row">
        <span>String key (lazy): </span>
        <span data-test-subj="userStorageTest:lazy-string-key-value">{lazyStringValue}</span>
      </div>
    </>
  );
};

export const App = ({ userStorage }: { userStorage: IUserStorageClient }) => (
  <UserStorageProvider userStorage={userStorage}>
    <h1>User Storage Test</h1>
    <StringKeyValue />
  </UserStorageProvider>
);

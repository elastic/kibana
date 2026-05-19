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
  const [value] = useUserStorage<string>('test:string_key');
  return (
    <div data-test-subj="userStorageTest:string-key-row">
      <span>String key: </span>
      <span data-test-subj="userStorageTest:string-key-value">{value}</span>
    </div>
  );
};

export const App = ({ userStorage }: { userStorage: IUserStorageClient }) => (
  <UserStorageProvider userStorage={userStorage}>
    <h1>User Storage Test</h1>
    <StringKeyValue />
  </UserStorageProvider>
);

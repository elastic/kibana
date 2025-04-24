/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { NewsfeedContext } from './newsfeed_header_nav_button';
import { FetchResult } from '../types';
import { NewsfeedApi } from '../lib/api';

export interface Props {
  newsfeedApi: NewsfeedApi;
  children: React.ReactNode;
}

export const NewsfeedContainer = ({ newsfeedApi, children }: Props) => {
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);

  useEffect(() => {
    const subscription = newsfeedApi.fetchResults$.subscribe((results) => {
      setNewsFetchResult(results);
    });
    return () => subscription.unsubscribe();
  }, [newsfeedApi]);

  return (
    <NewsfeedContext.Provider value={{ setFlyoutVisible: () => {}, newsFetchResult }}>
      {children}
    </NewsfeedContext.Provider>
  );
};

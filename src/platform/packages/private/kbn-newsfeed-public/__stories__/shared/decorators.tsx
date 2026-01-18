/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Decorator } from '@storybook/react';
import type { FetchResult } from '../../src/types';
import { mockFetchResult } from './data';

// Create context here for stories (plugin has its own instance)
interface NewsfeedContextValue {
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  newsFetchResult: FetchResult | void | null;
}

export const NewsfeedContext = React.createContext<NewsfeedContextValue | null>(null);

export type NewsfeedState = 'loading' | 'empty' | 'error' | 'with-news';

// Type-safe parameters for the decorator
export interface NewsfeedDecoratorParameters {
  state: NewsfeedState;
}

// Using Storybook's decorator API with typed parameters
export const FlyoutDecorator: Decorator = (Story, context) => {
  const [, setFlyoutVisible] = React.useState(true);
  const { state } = context.parameters;
  let fetchResult: FetchResult | null | void = mockFetchResult;

  // For loading state story, set results to null
  if (state === 'loading') {
    fetchResult = null;
  }
  // For empty state story, set results to empty items
  else if (state === 'empty') {
    fetchResult = {
      ...mockFetchResult,
      feedItems: [],
      hasNew: false,
    };
  }
  // For error state story, set to empty with error
  else if (state === 'error') {
    fetchResult = {
      ...mockFetchResult,
      feedItems: [],
      hasNew: false,
      error: new Error('Failed to fetch newsfeed'),
    };
  }
  // Default: use full mock data with all categories
  else {
    fetchResult = mockFetchResult;
  }

  return (
    <NewsfeedContext.Provider
      value={{
        setFlyoutVisible,
        newsFetchResult: fetchResult,
      }}
    >
      <Story />
    </NewsfeedContext.Provider>
  );
};

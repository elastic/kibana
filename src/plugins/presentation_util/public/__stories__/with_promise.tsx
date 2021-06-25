/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { Story } from '@storybook/react';
import { StoryFnReactReturnType } from '@storybook/react/dist/client/preview/types';
import { StoryContext } from '@storybook/addons';

export const withPromise = ({ promise, loading }: { promise: any; loading?: boolean }) => (
  story: Story
) => {
  const [component, setComponent] = useState<StoryFnReactReturnType>();
  const placeholder = loading ? loading : <div>Loading...</div>;

  useEffect(() => {
    if (!component) {
      promise.then((res: any) => {
        setComponent(story(res, {} as StoryContext));
      });
    }
  }, [story, component]);

  return !component ? placeholder : component;
};

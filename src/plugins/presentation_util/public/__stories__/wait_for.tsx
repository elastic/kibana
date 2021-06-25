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

export const waitFor = ({
  waitTarget,
  loaderComponent,
}: {
  waitTarget: Promise<any>;
  loaderComponent?: boolean;
}) => (story: Story) => {
  const [storyComponent, setStory] = useState<StoryFnReactReturnType>();
  const loader = loaderComponent ?? <div>Loading...</div>;

  useEffect(() => {
    if (!storyComponent) {
      waitTarget.then((waitedTarget: any) => {
        setStory(story(waitedTarget, {} as StoryContext));
      });
    }
  }, [story, storyComponent]);

  return storyComponent ? storyComponent : loader;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { NewsfeedFlyout } from '../src/components/flyout';
import { FlyoutDecorator, NewsfeedContext, type NewsfeedDecoratorParameters } from './shared';

// Mock context hook for stories (since context is in the plugin)
const useNewsfeedContext = () => {
  const context = React.useContext(NewsfeedContext);
  if (!context) {
    throw new Error('useNewsfeedContext must be used within decorator');
  }
  return context;
};

// Wrapper to pass context values as props
const NewsfeedFlyoutWithContext: React.FC<
  Omit<React.ComponentProps<typeof NewsfeedFlyout>, 'newsFetchResult' | 'setFlyoutVisible'>
> = (props) => {
  const { newsFetchResult, setFlyoutVisible } = useNewsfeedContext();
  return (
    <NewsfeedFlyout
      {...props}
      newsFetchResult={newsFetchResult}
      setFlyoutVisible={setFlyoutVisible}
    />
  );
};

// Meta configuration for Newsfeed components
const meta: Meta<typeof NewsfeedFlyoutWithContext> = {
  title: 'Newsfeed/Flyout',
  component: NewsfeedFlyoutWithContext,
  argTypes: {
    // Disable props inherited from EuiFlyoutProps that aren't relevant for these stories
    as: {
      control: false,
    },
    session: {
      control: false,
    },
    showPlainSpinner: {
      control: false,
    },
  },
};

export default meta;

type FlyoutStory = StoryObj<typeof NewsfeedFlyoutWithContext> & {
  parameters: NewsfeedDecoratorParameters;
};

export const FlyoutWithNews: FlyoutStory = {
  render: (args) => <NewsfeedFlyoutWithContext {...args} />,
  decorators: [FlyoutDecorator],
  parameters: {
    state: 'with-news',
  },
  args: {
    showPlainSpinner: false,
    isServerless: false,
  },
  argTypes: {
    isServerless: {
      control: 'boolean',
      description: 'Hide version information for serverless deployments',
    },
  },
};

export const FlyoutLoadingState: FlyoutStory = {
  render: (args) => <NewsfeedFlyoutWithContext {...args} />,
  decorators: [FlyoutDecorator],
  parameters: {
    state: 'loading',
  },
  args: {
    showPlainSpinner: false,
    isServerless: false,
  },
  argTypes: {
    isServerless: {
      control: 'boolean',
      description: 'Hide version information for serverless deployments',
    },
  },
};

export const FlyoutEmptyState: FlyoutStory = {
  render: (args) => <NewsfeedFlyoutWithContext {...args} />,
  decorators: [FlyoutDecorator],
  parameters: {
    state: 'empty',
  },
  args: {
    showPlainSpinner: false,
    isServerless: false,
  },
  argTypes: {
    isServerless: {
      control: 'boolean',
      description: 'Hide version information for serverless deployments',
    },
  },
};

export const FlyoutErrorState: FlyoutStory = {
  render: (args) => <NewsfeedFlyoutWithContext {...args} />,
  decorators: [FlyoutDecorator],
  parameters: {
    state: 'error',
  },
  args: {
    showPlainSpinner: false,
    isServerless: false,
  },
  argTypes: {
    isServerless: {
      control: 'boolean',
      description: 'Hide version information for serverless deployments',
    },
  },
};

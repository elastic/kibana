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
import { NewsEmptyPrompt } from '../src/components/empty_news';
import { NewsListing } from '../src/components/listing';
import { NewsLoadingPrompt } from '../src/components/loading_news';
import { FlyoutDecorator, NewsfeedContext, type NewsfeedDecoratorParameters } from './shared';

const meta: Meta = {
  title: 'Newsfeed/Components',
};

export default meta;

type LoadingStory = StoryObj<typeof NewsLoadingPrompt>;

export const LoadingPrompt: LoadingStory = {
  render: (args) => <NewsLoadingPrompt {...args} />,
  args: {
    showPlainSpinner: false,
  },
  argTypes: {
    showPlainSpinner: {
      control: 'boolean',
      description:
        'Use plain spinner instead of Elastic branded spinner for custom branding scenarios',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state shown while fetching news items from the API',
      },
    },
  },
};

type EmptyStory = StoryObj<typeof NewsEmptyPrompt>;

export const EmptyPrompt: EmptyStory = {
  render: () => <NewsEmptyPrompt />,
  parameters: {
    docs: {
      description: {
        story: 'Empty state shown when no news items are available',
      },
    },
  },
};

// Mock context hook for stories (since context is in the plugin)
const useNewsfeedContext = () => {
  const context = React.useContext(NewsfeedContext);
  if (!context) {
    throw new Error('useNewsfeedContext must be used within decorator');
  }
  return context;
};

// Wrapper component to bridge context to props and handle category filtering
const NewsListWithContext: React.FC<{
  category?: 'observability' | 'security' | 'search';
  asSingleColumn?: boolean;
}> = ({ category, asSingleColumn }) => {
  const { newsFetchResult } = useNewsfeedContext();

  if (!newsFetchResult) {
    return <NewsLoadingPrompt showPlainSpinner={false} />;
  }

  // Filter feed items by category if provided
  // If category is undefined, show general news (no category)
  const filteredItems = newsFetchResult.feedItems.filter((item) => {
    if (category) {
      return item.category === category;
    }
    return !item.category;
  });

  // If no items after filtering, show empty prompt
  if (filteredItems.length === 0) {
    return <NewsEmptyPrompt />;
  }

  return <NewsListing feedItems={filteredItems} asSingleColumn={asSingleColumn} />;
};

type ListStory = StoryObj<{
  category?: 'observability' | 'security' | 'search';
  asSingleColumn?: boolean;
}> & {
  parameters: NewsfeedDecoratorParameters;
};

export const List: ListStory = {
  name: 'News Listing',
  render: (args) => (
    <NewsListWithContext category={args.category} asSingleColumn={args.asSingleColumn} />
  ),
  decorators: [FlyoutDecorator],
  parameters: {
    state: 'with-news',
    docs: {
      description: {
        story:
          'Newsfeed listing component displaying news items. The component filters items by category. Use the category control to see different filtered views: undefined shows general news (no category), or select observability/security/search to see category-specific news. The asSingleColumn control allows you to test the layout in single or double column mode.',
      },
    },
  },
  args: {
    category: undefined,
    asSingleColumn: false,
  },
  argTypes: {
    category: {
      control: 'select',
      options: [undefined, 'observability', 'security', 'search'],
      description:
        'Filter news by category. undefined = general news (no category), or select a specific category',
    },
    asSingleColumn: {
      control: 'boolean',
      description:
        'Display the listing in single column mode (true) or double column mode (false). This simulates the responsive behavior that normally triggers at 2200px window width.',
    },
  },
};

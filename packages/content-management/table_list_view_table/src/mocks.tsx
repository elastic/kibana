/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { from } from 'rxjs';

import type { Services, TagListProps } from './services';

/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type Params = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;
type ActionFn = (name: string) => any;

export const TagList = ({ onClick, references, tagRender }: TagListProps) => {
  if (references.length === 0) {
    return null;
  }

  return (
    <div>
      {references.map((ref) => {
        const tag = { ...ref, color: 'blue', description: '', managed: false };

        if (tagRender) {
          return tagRender(tag);
        }

        return (
          <button
            key={tag.name}
            onClick={() => {
              if (onClick) {
                onClick(tag);
              }
            }}
            data-test-subj={`tag-${tag.id}`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};

export const getTagList =
  ({ references: _tags }: TagListProps = { references: [] }) =>
  ({ onClick }: TagListProps) => {
    return <TagList onClick={onClick} references={_tags} />;
  };

/**
 * Returns Storybook-compatible service abstractions for the `NoDataCard` Provider.
 */
export const getStoryServices = (params: Params, action: ActionFn = () => {}) => {
  const services: Services = {
    canEditAdvancedSettings: true,
    getListingLimitSettingsUrl: () => 'http://elastic.co',
    notifyError: (title, text) => {
      action('notifyError')({ title, text });
    },
    currentAppId$: from('mockedApp'),
    navigateToUrl: () => undefined,
    TagList,
    getTagList: () => [],
    itemHasTags: () => true,
    getTagManagementUrl: () => '',
    getTagIdsFromReferences: () => [],
    isTaggingEnabled: () => true,
    isFavoritesEnabled: () => false,
    ...params,
  };

  return services;
};

/**
 * Returns the Storybook arguments for `NoDataCard`, for its stories and for
 * consuming component stories.
 */
export const getStoryArgTypes = () => ({
  title: {
    control: {
      type: 'text',
    },
    defaultValue: 'My dashboards',
  },
  entityName: {
    control: {
      type: 'text',
    },
    defaultValue: 'Dashboard',
  },
  entityNamePlural: {
    control: {
      type: 'text',
    },
    defaultValue: 'Dashboards',
  },
  canCreateItem: {
    control: 'boolean',
    defaultValue: true,
  },
  canEditItem: {
    control: 'boolean',
    defaultValue: true,
  },
  canDeleteItem: {
    control: 'boolean',
    defaultValue: true,
  },
  showCustomColumn: {
    control: 'boolean',
    defaultValue: false,
  },
  numberOfItemsToRender: {
    control: {
      type: 'number',
    },
    defaultValue: 15,
  },
  initialFilter: {
    control: {
      type: 'text',
    },
    defaultValue: '',
  },
  initialPageSize: {
    control: {
      type: 'number',
    },
    defaultValue: 10,
  },
  listingLimit: {
    control: {
      type: 'number',
    },
    defaultValue: 20,
  },
  asManagementSection: {
    control: 'boolean',
    defaultValue: false,
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { UserProfilesProvider } from '@kbn/content-management-user-profiles';
import type { ContentEditorKibanaDependencies, TagSelectorProps } from './services';
import { ContentEditorKibanaProvider, useServices } from './services';

type SavedObjectsTagging = NonNullable<ContentEditorKibanaDependencies['savedObjectsTagging']>;
type PluginTagListProps = React.ComponentProps<SavedObjectsTagging['ui']['components']['TagList']>;

const createCoreMock = (): ContentEditorKibanaDependencies['core'] =>
  ({
    analytics: {
      reportEvent: jest.fn(),
    },
    i18n: {},
    theme: {
      theme$: {},
    },
    userProfile: {},
    overlays: {
      openSystemFlyout: jest.fn(() => ({
        onClose: Promise.resolve(),
        close: () => Promise.resolve(),
      })),
    },
    notifications: {
      toasts: {
        addDanger: jest.fn(),
      },
    },
    rendering: {
      addContext: (element: React.ReactNode) => <>{element}</>,
    },
  } as unknown as ContentEditorKibanaDependencies['core']);

const createWrapper = (
  savedObjectsTagging: ContentEditorKibanaDependencies['savedObjectsTagging']
) => {
  const queryClient = new QueryClient();

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <UserProfilesProvider
        bulkGetUserProfiles={jest.fn()}
        getUserProfile={jest.fn()}
        suggestUserProfiles={jest.fn()}
      >
        <ContentEditorKibanaProvider
          core={createCoreMock()}
          savedObjectsTagging={savedObjectsTagging}
        >
          {children}
        </ContentEditorKibanaProvider>
      </UserProfilesProvider>
    </QueryClientProvider>
  );
};

const TagListConsumer = ({ tagIds }: { tagIds: string[] }) => {
  const { TagList } = useServices();

  if (!TagList) {
    return null;
  }

  return <TagList tagIds={tagIds} />;
};

describe('ContentEditorKibanaProvider', () => {
  test('adapts tag IDs to saved object references for the plugin TagList', () => {
    const PluginTagList = jest.fn<React.ReactElement | null, [PluginTagListProps]>(() => null);
    const SavedObjectSaveModalTagSelector = jest.fn<React.ReactElement | null, [TagSelectorProps]>(
      () => null
    );

    render(<TagListConsumer tagIds={['tag-1', 'tag-2']} />, {
      wrapper: createWrapper({
        ui: {
          components: {
            TagList: PluginTagList,
            SavedObjectSaveModalTagSelector,
          },
        },
      }),
    });

    expect(PluginTagList.mock.calls[0][0]).toEqual({
      object: {
        references: [
          { id: 'tag-1', name: 'tag-tag-1', type: 'tag' },
          { id: 'tag-2', name: 'tag-tag-2', type: 'tag' },
        ],
      },
    });
  });
});

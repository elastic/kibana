/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren, ReactNode } from 'react';
import React, { useCallback, useContext, useMemo } from 'react';
import {
  UserProfilesKibanaProvider,
  UserProfilesProvider,
  useUserProfilesServices,
} from '@kbn/content-management-user-profiles';
import { QueryClient, QueryClientProvider, useQueryClient } from '@kbn/react-query';

/**
 * Create a React Query client for a single content-editor provider instance.
 *
 * Called inside a `useMemo` so each mounted {@link ContentEditorKibanaProvider}
 * gets its own client that can be garbage-collected on unmount, avoiding
 * unbounded cache growth when multiple instances are mounted across the app.
 */
const createContentEditorQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

import type { EuiComboBoxProps } from '@elastic/eui';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';

type NotifyFn = (title: JSX.Element, text?: string) => void;

export type TagSelectorProps = EuiComboBoxProps<unknown> & {
  initialSelection: string[];
  onTagsSelected: (ids: string[]) => void;
};

export interface SavedObjectsReference {
  id: string;
  name: string;
  type: string;
}

export interface Theme {
  readonly darkMode: boolean;
}

/**
 * Abstract external services for this component.
 */
export interface Services {
  openSystemFlyout(node: ReactNode, options?: OverlaySystemFlyoutOpenOptions): OverlayRef;
  notifyError: NotifyFn;
  TagList?: FC<{ tagIds: string[] }>;
  TagSelector?: React.FC<TagSelectorProps>;
}

const ContentEditorContext = React.createContext<Services | null>(null);

/**
 * Abstract external service Provider.
 */
export const ContentEditorProvider: FC<PropsWithChildren<Services>> = ({
  children,
  ...services
}) => {
  return <ContentEditorContext.Provider value={services}>{children}</ContentEditorContext.Provider>;
};

/**
 * Specific services for mounting React
 */
interface ContentEditorStartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
  userProfile: UserProfileService;
}

/**
 * Kibana-specific service types.
 */
export interface ContentEditorKibanaDependencies {
  /** CoreStart contract */
  core: ContentEditorStartServices & {
    overlays: {
      openSystemFlyout(
        content: React.ReactElement,
        options?: OverlaySystemFlyoutOpenOptions
      ): OverlayRef;
    };
    notifications: {
      toasts: {
        addDanger: (notifyArgs: { title: MountPoint; text?: string }) => void;
      };
    };
    rendering: {
      addContext: (element: React.ReactNode) => React.ReactElement;
    };
  };
  /**
   * The public API from the savedObjectsTaggingOss plugin.
   * It is returned by calling `getTaggingApi()` from the SavedObjectTaggingOssPluginStart
   *
   * ```js
   * const savedObjectsTagging = savedObjectsTaggingOss?.getTaggingApi()
   * ```
   */
  savedObjectsTagging?: {
    ui: {
      components: {
        TagList: React.FC<{
          object: {
            references: SavedObjectsReference[];
          };
          onClick?: (tag: {
            name: string;
            description: string;
            color: string;
            managed: boolean;
          }) => void;
        }>;
        SavedObjectSaveModalTagSelector: React.FC<TagSelectorProps>;
      };
    };
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 *
 * Self-provides every external context the editor needs so consumers can drop
 * it into any provider tree without thinking about ancestry:
 *
 * - {@link QueryClientProvider} — the inner body uses `useQueryClient()` to
 *   forward the client into the system flyout it opens, so user-profile
 *   queries inside the flyout work without an outer `QueryClientProvider`.
 * - {@link UserProfilesKibanaProvider} — the inner body reads profile services
 *   via `useUserProfilesServices()` for the same forwarding reason.
 *
 * When this provider is itself rendered under another `QueryClientProvider`
 * or `UserProfilesProvider` (e.g. legacy `TableListViewKibanaProvider`), the
 * inner providers shadow the outer with semantically equivalent values derived
 * from the same `core` services, so nesting is harmless.
 */
export const ContentEditorKibanaProvider: FC<
  PropsWithChildren<ContentEditorKibanaDependencies>
> = ({ children, ...services }) => {
  // Create a per-instance QueryClient so the cache is released when this
  // provider unmounts, preventing unbounded memory growth across multiple
  // mounted ContentEditorKibanaProvider trees.
  const queryClient = useMemo(() => createContentEditorQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserProfilesKibanaProvider core={services.core}>
        <ContentEditorKibanaProviderInner {...services}>
          {children}
        </ContentEditorKibanaProviderInner>
      </UserProfilesKibanaProvider>
    </QueryClientProvider>
  );
};

/**
 * Inner body of {@link ContentEditorKibanaProvider}.
 *
 * Split from the public provider so `useUserProfilesServices()` reads from
 * the {@link UserProfilesKibanaProvider} rendered by the outer wrapper.
 */
const ContentEditorKibanaProviderInner: FC<PropsWithChildren<ContentEditorKibanaDependencies>> = ({
  children,
  ...services
}) => {
  const { core, savedObjectsTagging } = services;
  const { overlays, notifications, rendering } = core;
  const { openSystemFlyout: coreOpenFlyout } = overlays;

  const TagList = useMemo(() => {
    const Comp: Services['TagList'] = ({ tagIds }) => {
      if (!savedObjectsTagging?.ui.components.TagList) {
        return null;
      }
      const PluginTagList = savedObjectsTagging.ui.components.TagList;
      const references = tagIds.map((id) => ({ type: 'tag', id, name: `tag-${id}` }));
      return <PluginTagList object={{ references }} />;
    };

    return Comp;
  }, [savedObjectsTagging?.ui.components.TagList]);

  const userProfilesServices = useUserProfilesServices();
  const queryClient = useQueryClient();

  const openSystemFlyout = useCallback(
    (node: ReactNode, options: OverlaySystemFlyoutOpenOptions) => {
      return coreOpenFlyout(
        <QueryClientProvider client={queryClient}>
          <UserProfilesProvider {...userProfilesServices}>{node}</UserProfilesProvider>
        </QueryClientProvider>,
        options
      );
    },
    [coreOpenFlyout, userProfilesServices, queryClient]
  );

  return (
    <ContentEditorProvider
      openSystemFlyout={openSystemFlyout}
      notifyError={(title, text) => {
        notifications.toasts.addDanger({ title: toMountPoint(title, rendering), text });
      }}
      TagList={TagList}
      TagSelector={savedObjectsTagging?.ui.components.SavedObjectSaveModalTagSelector}
    >
      {children}
    </ContentEditorProvider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(ContentEditorContext);

  if (!context) {
    throw new Error(
      'ContentEditorContext is missing. Ensure your component or React root is wrapped with <ContentEditorProvider /> or <ContentEditorKibanaProvider />.'
    );
  }

  return context;
}

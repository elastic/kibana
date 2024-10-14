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
  UserProfilesProvider,
  useUserProfilesServices,
} from '@kbn/content-management-user-profiles';

import type { EuiComboBoxProps } from '@elastic/eui';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
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
  openFlyout(node: ReactNode, options?: OverlayFlyoutOpenOptions): OverlayRef;
  notifyError: NotifyFn;
  TagList?: FC<{ references: SavedObjectsReference[] }>;
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
}

/**
 * Kibana-specific service types.
 */
export interface ContentEditorKibanaDependencies {
  /** CoreStart contract */
  core: ContentEditorStartServices & {
    overlays: {
      openFlyout(mount: MountPoint, options?: OverlayFlyoutOpenOptions): OverlayRef;
    };
    notifications: {
      toasts: {
        addDanger: (notifyArgs: { title: MountPoint; text?: string }) => void;
      };
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
 */
export const ContentEditorKibanaProvider: FC<
  PropsWithChildren<ContentEditorKibanaDependencies>
> = ({ children, ...services }) => {
  const { core, savedObjectsTagging } = services;
  const { overlays, notifications, ...startServices } = core;
  const { openFlyout: coreOpenFlyout } = overlays;

  const TagList = useMemo(() => {
    const Comp: Services['TagList'] = ({ references }) => {
      if (!savedObjectsTagging?.ui.components.TagList) {
        return null;
      }
      const PluginTagList = savedObjectsTagging.ui.components.TagList;
      return <PluginTagList object={{ references }} />;
    };

    return Comp;
  }, [savedObjectsTagging?.ui.components.TagList]);

  const userProfilesServices = useUserProfilesServices();

  const openFlyout = useCallback(
    (node: ReactNode, options: OverlayFlyoutOpenOptions) => {
      return coreOpenFlyout(
        toMountPoint(
          <UserProfilesProvider {...userProfilesServices}>{node}</UserProfilesProvider>,
          startServices
        ),
        options
      );
    },
    [coreOpenFlyout, startServices, userProfilesServices]
  );

  return (
    <ContentEditorProvider
      openFlyout={openFlyout}
      notifyError={(title, text) => {
        notifications.toasts.addDanger({ title: toMountPoint(title, startServices), text });
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

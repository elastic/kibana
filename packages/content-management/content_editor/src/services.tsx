/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { EuiComboBoxProps } from '@elastic/eui';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayFlyoutOpenOptions } from '@kbn/core-overlays-browser';

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
export const ContentEditorProvider: FC<Services> = ({ children, ...services }) => {
  return <ContentEditorContext.Provider value={services}>{children}</ContentEditorContext.Provider>;
};

/**
 * Kibana-specific service types.
 */
export interface ContentEditorKibanaDependencies {
  /** CoreStart contract */
  core: {
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
   * Handler from the '@kbn/kibana-react-plugin/public' Plugin
   *
   * ```
   * import { toMountPoint } from '@kbn/kibana-react-plugin/public';
   * ```
   */
  toMountPoint: (
    node: React.ReactNode,
    options?: { theme$: Observable<{ readonly darkMode: boolean }> }
  ) => MountPoint;
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
          onClick?: (tag: { name: string; description: string; color: string }) => void;
        }>;
        SavedObjectSaveModalTagSelector: React.FC<TagSelectorProps>;
      };
    };
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const ContentEditorKibanaProvider: FC<ContentEditorKibanaDependencies> = ({
  children,
  ...services
}) => {
  const { core, toMountPoint, savedObjectsTagging } = services;
  const { openFlyout: coreOpenFlyout } = core.overlays;

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

  const openFlyout = useCallback(
    (node: ReactNode, options: OverlayFlyoutOpenOptions) => {
      return coreOpenFlyout(toMountPoint(node), options);
    },
    [toMountPoint, coreOpenFlyout]
  );

  return (
    <ContentEditorProvider
      openFlyout={openFlyout}
      notifyError={(title, text) => {
        core.notifications.toasts.addDanger({ title: toMountPoint(title), text });
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

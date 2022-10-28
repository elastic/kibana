/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useCallback } from 'react';
import type { FC, ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayFlyoutOpenOptions } from '@kbn/core-overlays-browser';

interface TagSelectorProps {
  initialSelection: string[];
  onTagsSelected: (ids: string[]) => void;
}

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
  TagSelector?: React.FC<TagSelectorProps>;
}

const InspectorContext = React.createContext<Services | null>(null);

/**
 * Abstract external service Provider.
 */
export const InspectorProvider: FC<Services> = ({ children, ...services }) => {
  return <InspectorContext.Provider value={services}>{children}</InspectorContext.Provider>;
};

/**
 * Kibana-specific service types.
 */
export interface TableListViewKibanaDependencies {
  /** CoreStart contract */
  core: {
    overlays: {
      openFlyout(mount: MountPoint, options?: OverlayFlyoutOpenOptions): OverlayRef;
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
        SavedObjectSaveModalTagSelector: React.FC<TagSelectorProps>;
      };
    };
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const InspectorKibanaProvider: FC<TableListViewKibanaDependencies> = ({
  children,
  ...services
}) => {
  const { core, toMountPoint, savedObjectsTagging } = services;
  const { openFlyout: coreOpenFlyout } = core.overlays;

  const openFlyout = useCallback(
    (node: ReactNode, options: OverlayFlyoutOpenOptions) => {
      return coreOpenFlyout(toMountPoint(node), options);
    },
    [toMountPoint, coreOpenFlyout]
  );

  return (
    <InspectorProvider
      openFlyout={openFlyout}
      TagSelector={savedObjectsTagging?.ui.components.SavedObjectSaveModalTagSelector}
    >
      {children}
    </InspectorProvider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(InspectorContext);

  if (!context) {
    throw new Error(
      'InspectorContext is missing. Ensure your component or React root is wrapped with <InspectorProvider /> or <InspectorKibanaProvider />.'
    );
  }

  return context;
}

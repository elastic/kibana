/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren, ReactNode } from 'react';
import React, { useCallback, useContext } from 'react';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';

type NotifyFn = (title: JSX.Element, text?: string) => void;

export interface Theme {
  readonly darkMode: boolean;
}

/**
 * Abstract external services for this component.
 */
export interface Services {
  openFlyout(node: ReactNode, options?: OverlayFlyoutOpenOptions): OverlayRef;
  notifyError: NotifyFn;
}

const ContentSourceContext = React.createContext<Services | null>(null);

/**
 * Abstract external service Provider.
 */
export const ContentSourceProvider: FC<PropsWithChildren<Services>> = ({
  children,
  ...services
}) => {
  return <ContentSourceContext.Provider value={services}>{children}</ContentSourceContext.Provider>;
};

/**
 * Specific services for mounting React
 */
interface ContentSourceStartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
  userProfile: UserProfileService;
}

/**
 * Kibana-specific service types.
 */
export interface ContentSourceKibanaDependencies {
  /** CoreStart contract */
  core: ContentSourceStartServices & {
    overlays: {
      openFlyout(mount: MountPoint, options?: OverlayFlyoutOpenOptions): OverlayRef;
    };
    notifications: {
      toasts: {
        addDanger: (notifyArgs: { title: MountPoint; text?: string }) => void;
      };
    };
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const ContentSourceKibanaProvider: FC<
  PropsWithChildren<ContentSourceKibanaDependencies>
> = ({ children, ...services }) => {
  const { core } = services;
  const { overlays, notifications, ...startServices } = core;
  const { openFlyout: coreOpenFlyout } = overlays;

  const openFlyout = useCallback(
    (node: ReactNode, options: OverlayFlyoutOpenOptions) => {
      return coreOpenFlyout(toMountPoint(node, startServices), options);
    },
    [coreOpenFlyout, startServices]
  );

  return (
    <ContentSourceProvider
      openFlyout={openFlyout}
      notifyError={(title, text) => {
        notifications.toasts.addDanger({ title: toMountPoint(title, startServices), text });
      }}
    >
      {children}
    </ContentSourceProvider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(ContentSourceContext);

  if (!context) {
    throw new Error(
      'ContentSourceContext is missing. Ensure your component or React root is wrapped with <ContentSourceProvider /> or <ContentSourceKibanaProvider />.'
    );
  }

  return context;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';

import type { EuiProviderProps } from '@elastic/eui';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import {
  KibanaRootContextProvider,
  type KibanaRootContextProviderProps,
} from '@kbn/react-kibana-context-root';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';

/**
 * Props for KibanaRenderContextProvider (deprecated)
 *
 * @deprecated use the KibanaRenderContextProviderCoreStartProps interface
 *
 * Using this form is discouraged because it causes code to be continually revisited when new features that
 * depend on CoreStart deps are encapsulated in KibanaRenderContextProvider.
 */
export type KibanaRenderContextProviderProps = Omit<KibanaRootContextProviderProps, 'globalStyles'>;

/**
 * Props for KibanaRenderContextProvider (preferred)
 *
 * Using this form is encouraged because it allows for minimal impacts across the Kibana codebase when new
 * features that depend on CoreStart deps are encapsulated in KibanaRenderContextProvider.
 */
export interface KibanaRenderContextProviderCoreStartProps {
  coreStart: {
    i18n: I18nStart;
    analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
    executionContext: ExecutionContextStart;
    theme: Pick<ThemeServiceStart, 'theme$'>;
    userProfile: Pick<UserProfileService, 'getUserProfile$'>;
  };
  colorMode?: EuiProviderProps<{}>['colorMode'];
  modify?: EuiProviderProps<{}>['modify'];
}

function isPropsICoreStart(
  props: KibanaRenderContextProviderProps | KibanaRenderContextProviderCoreStartProps
): props is KibanaRenderContextProviderCoreStartProps {
  return typeof (props as KibanaRenderContextProviderCoreStartProps).coreStart !== 'undefined';
}

/**
 * The `KibanaRenderContextProvider` provides the necessary context for an out-of-current
 * React render, such as using `ReactDOM.render()`.
 *
 * Usage: <KibanaRenderContextProvider coreStart={coreStart}>{...}</KibanaRenderContextProvider>
 */
export const KibanaRenderContextProvider: FC<
  PropsWithChildren<KibanaRenderContextProviderProps | KibanaRenderContextProviderCoreStartProps>
> = ({ children, ...props }) => {
  let coreStart:
    | KibanaRenderContextProviderCoreStartProps['coreStart']
    | KibanaRenderContextProviderProps;
  if (isPropsICoreStart(props)) {
    coreStart = props.coreStart;
  } else {
    coreStart = props;
  }

  const { analytics, executionContext, i18n, theme, userProfile } = coreStart;
  const { modify, colorMode } = props;

  return (
    <KibanaRootContextProvider
      globalStyles={false}
      {...{ executionContext, i18n, theme, userProfile, modify, colorMode }}
    >
      <KibanaErrorBoundaryProvider analytics={analytics}>
        <KibanaErrorBoundary>{children}</KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    </KibanaRootContextProvider>
  );
};

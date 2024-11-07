/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';

// @ts-expect-error EUI exports this component internally, but Kibana isn't picking it up its types
import { useIsNestedEuiProvider } from '@elastic/eui/lib/components/provider/nested';
// @ts-expect-error EUI exports this component internally, but Kibana isn't picking it up its types
import { emitEuiProviderWarning } from '@elastic/eui/lib/services/theme/warning';

import { KibanaEuiProvider, type KibanaEuiProviderProps } from './eui_provider';

/** Props for the KibanaRootContextProvider */
export interface KibanaRootContextProviderProps extends KibanaEuiProviderProps {
  /** The `I18nStart` API from `CoreStart`. */
  i18n: I18nStart;
  /** The `AnalyticsServiceStart` API from `CoreStart`. */
  analytics?: Pick<AnalyticsServiceStart, 'reportEvent'>;
}

/**
 * The `KibanaRootContextProvider` provides the necessary context at the root of Kibana, including
 * initialization and the theme and i18n contexts.  This context should only be used _once_, and
 * at the _very top_ of the application root, rendered by the `RenderingService`.
 *
 * While this context is exposed for edge cases and tooling, (e.g. Storybook, Jest, etc.), it should
 * _not_ be used in applications.  Instead, applications should choose the context that makes the
 * most sense for the problem they are trying to solve:
 *
 * - Consider `KibanaRenderContextProvider` for rendering components outside the current tree, (e.g.
 * with `ReactDOM.render`).
 * - Consider `KibanaThemeContextProvider` for altering the theme of a component or tree of components.
 *
 */
export const KibanaRootContextProvider: FC<PropsWithChildren<KibanaRootContextProviderProps>> = ({
  children,
  i18n,
  ...props
}) => {
  const hasEuiProvider = useIsNestedEuiProvider();

  if (hasEuiProvider) {
    emitEuiProviderWarning(
      'KibanaRootContextProvider has likely been nested in this React tree, either by direct reference or by KibanaRenderContextProvider.  The result of this nesting is a nesting of EuiProvider, which has negative effects.  Check your React tree for nested Kibana context providers.'
    );
    return <i18n.Context>{children}</i18n.Context>;
  } else {
    return (
      <KibanaEuiProvider {...props}>
        <i18n.Context>{children}</i18n.Context>
      </KibanaEuiProvider>
    );
  }
};

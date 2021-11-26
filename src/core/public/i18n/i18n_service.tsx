/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiContext } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';

import { getEuiContextMapping } from './i18n_eui_mapping';

/**
 * Service that is responsible for i18n capabilities.
 * @internal
 */
export class I18nService {
  /**
   * Used exclusively to give a Context component to FatalErrorsService which
   * may render before Core successfully sets up or starts.
   *
   * Separated from `start` to disambiguate that this can be called from within
   * Core outside the lifecycle flow.
   * @internal
   */
  public getContext(): I18nStart {
    const euiContextMapping = getEuiContextMapping();

    const mapping = {
      ...euiContextMapping,
    };
    return {
      Context: function I18nContext({ children }) {
        return (
          <I18nProvider>
            <EuiContext i18n={{ mapping }}>{children}</EuiContext>
          </I18nProvider>
        );
      },
    };
  }

  public start(): I18nStart {
    return this.getContext();
  }

  public stop() {
    // nothing to do here currently
  }
}

/**
 * I18nStart.Context is required by any localizable React component from \@kbn/i18n and \@elastic/eui packages
 * and is supposed to be used as the topmost component for any i18n-compatible React tree.
 *
 * @public
 *
 */
export interface I18nStart {
  /**
   * React Context provider required as the topmost component for any i18n-compatible React tree.
   */
  Context: ({ children }: { children: React.ReactNode }) => JSX.Element;
}

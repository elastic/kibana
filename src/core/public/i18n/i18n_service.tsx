/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import { EuiContext } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';

/**
 * Service that is responsible for i18n capabilities.
 * @internal
 */
export class I18nService {
  public setup() {
    const mapping = {
      'euiTablePagination.rowsPerPage': i18n.translate('core.euiTablePagination.rowsPerPage', {
        defaultMessage: 'Rows per page',
      }),
    };

    const setup: I18nSetup = {
      Context: function I18nContext({ children }) {
        return (
          <I18nProvider>
            <EuiContext i18n={{ mapping }}>{children}</EuiContext>
          </I18nProvider>
        );
      },
    };

    return setup;
  }

  public stop() {
    // nothing to do here currently
  }
}

/**
 * I18nSetup.Context is required by any localizable React component from \@kbn/i18n and \@elastic/eui packages
 * and is supposed to be used as the topmost component for any i18n-compatible React tree.
 *
 * @public
 *
 */
export interface I18nSetup {
  /**
   * React Context provider required as the topmost component for any i18n-compatible React tree.
   */
  Context: ({ children }: { children: React.ReactNode }) => JSX.Element;
}

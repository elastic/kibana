/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { i18n } from '@kbn/i18n/target/types';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ToastInput } from '@kbn/core-notifications-browser/target/types';
import { I18nStart } from '@kbn/core-i18n-browser';
import { ThemeServiceStart } from '@kbn/core-theme-browser';

export const ReloadPageToast = (theme: ThemeServiceStart, i18nStart: I18nStart): ToastInput => {
  return {
    title: i18n.translate('management.settings.form.requiresPageReloadToastDescription', {
      defaultMessage: 'One or more settings require you to reload the page to take effect.',
    }),
    text: toMountPoint(
      <KibanaThemeProvider theme={theme}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => window.location.reload()}
              data-test-subj="windowReloadButton"
            >
              {i18n.translate('management.settings.form.requiresPageReloadToastButtonLabel', {
                defaultMessage: 'Reload page',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaThemeProvider>,
      { i18n: i18nStart, theme }
    ),
    color: 'success',
  };
};

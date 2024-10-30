/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ToastInput } from '@kbn/core-notifications-browser';
import { I18nStart } from '@kbn/core-i18n-browser';
import { ThemeServiceStart } from '@kbn/core-theme-browser';

export const DATA_TEST_SUBJ_PAGE_RELOAD_BUTTON = 'pageReloadButton';

/**
 * Utility function for returning a {@link ToastInput} for displaying a prompt for reloading the page.
 * @param theme The {@link ThemeServiceStart} contract.
 * @param i18nStart The {@link I18nStart} contract.
 * @returns A toast.
 */
export const reloadPageToast = (theme: ThemeServiceStart, i18nStart: I18nStart): ToastInput => {
  return {
    title: i18n.translate('management.settings.form.requiresPageReloadToastDescription', {
      defaultMessage: 'One or more settings require you to reload the page to take effect.',
    }),
    text: toMountPoint(
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={() => window.location.reload()}
            data-test-subj={DATA_TEST_SUBJ_PAGE_RELOAD_BUTTON}
          >
            {i18n.translate('management.settings.form.requiresPageReloadToastButtonLabel', {
              defaultMessage: 'Reload page',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>,
      { i18n: i18nStart, theme }
    ),
    color: 'success',
    toastLifeTimeMs: 15000,
  };
};

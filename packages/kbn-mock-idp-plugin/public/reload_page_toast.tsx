/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ToastInput } from '@kbn/core-notifications-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

export const DATA_TEST_SUBJ_PAGE_RELOAD_BUTTON = 'pageReloadButton';

/**
 * Utility function for returning a {@link ToastInput} for displaying a prompt for reloading the page.
 * @param theme The {@link ThemeServiceStart} contract.
 * @param i18nStart The {@link I18nStart} contract.
 * @returns A toast.
 */
export const createReloadPageToast = (options: {
  user: Pick<AuthenticatedUser, 'roles'>;
  theme: ThemeServiceStart;
  i18n: I18nStart;
}): ToastInput => {
  return {
    title: `Your role has been set to '${options.user.roles.join(`', '`)}'.`,
    text: toMountPoint(
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={() => window.location.reload()}
            data-test-subj={DATA_TEST_SUBJ_PAGE_RELOAD_BUTTON}
          >
            Reload page
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>,
      { i18n: options.i18n, theme: options.theme }
    ),
    color: 'success',
    toastLifeTimeMs: 0x7fffffff, // Do not auto-hide toast since page is in an unknown state
  };
};

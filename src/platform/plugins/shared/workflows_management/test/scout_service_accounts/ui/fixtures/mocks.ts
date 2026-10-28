/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import type { WorkflowServiceAccount } from '../../../../public/entities/service_accounts';

export type DirectoryState = 'ready' | 'empty' | 'forbidden' | 'unavailable';

export const mockServiceAccountDirectory = async (
  page: ScoutPage,
  account: WorkflowServiceAccount
) => {
  let state: DirectoryState = 'ready';
  await page.route('**/internal/security/service_account?*', async (route) => {
    if (state === 'forbidden' || state === 'unavailable') {
      await route.fulfill({
        status: state === 'forbidden' ? 403 : 503,
        json: { message: 'Directory unavailable' },
      });
    } else {
      await route.fulfill({ json: { serviceAccounts: state === 'empty' ? [] : [account] } });
    }
  });
  return {
    set: (next: DirectoryState) => {
      state = next;
    },
  };
};

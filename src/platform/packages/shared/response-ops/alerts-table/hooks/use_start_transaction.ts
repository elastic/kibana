/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { TransactionOptions } from '@elastic/apm-rum';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

export const APP_UI_ID = '[managementUI]' as const;

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = { managed: true };

interface StartTransactionOptions {
  name: string;
  type?: string;
  options?: TransactionOptions;
}

export const useStartTransaction = () => {
  const {
    services: { apm },
  } = useAlertsTableContext();
  const startTransaction = useCallback(
    ({ name, type = 'user-interaction', options }: StartTransactionOptions) => {
      console.log({ apm, name, options, type });
      return apm?.startTransaction(name, type, options ?? DEFAULT_TRANSACTION_OPTIONS);
    },
    []
  );

  return { startTransaction };
};

export const ALERTS_ACTIONS = {
  VIEW_ALERT_DETAILS: `${APP_UI_ID} alertsTable viewAlertDetailsFlyout`,
  UNTRACK: `${APP_UI_ID} alertsTable untrack`,
  UNMUTE: `${APP_UI_ID} alertsTable unmute`,
  MUTE: `${APP_UI_ID} alertsTable mute`,
  FLYOUT_TABS: `${APP_UI_ID} alertsTable flyoutTabs`,
  //   OPEN_SESSION_VIEW: `${APP_UI_ID} alerts openSessionView`,
  //   INVESTIGATE_IN_TIMELINE: `${APP_UI_ID} alerts investigateInTimeline`,
};

// export const FIELD_BROWSER_ACTIONS = {
//   FIELD_SAVED: `${APP_UI_ID} fieldBrowser fieldSaved`,
//   FIELD_DELETED: `${APP_UI_ID} fieldBrowser fieldDeleted`,
// };

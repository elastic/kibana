/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { TransactionOptions, ApmBase } from '@elastic/apm-rum';

export const APP_UI_ID = '[managementUI]' as const;

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = { managed: true };

interface StartTransactionOptions {
  name: string;
  type?: string;
  options?: TransactionOptions;
}

export const useStartTransaction = (apm?: ApmBase) => {
  const startTransaction = useCallback(
    ({ name, type = 'user-interaction', options }: StartTransactionOptions) => {
      console.log({ apm, name, options, type });
      return apm?.startTransaction(name, type, options ?? DEFAULT_TRANSACTION_OPTIONS);
    },
    [apm]
  );

  return { startTransaction };
};

export const ALERT_FILTER_CONTROLS = {
  SAVE: `${APP_UI_ID} alertFilterControls save`,
  ADD: `${APP_UI_ID} alertFilterControls add`,
  DISCARD: `${APP_UI_ID} alertFilterControls discard`,
};

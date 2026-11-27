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
import { KbnDangerCallout } from '@kbn/ui-callout';

export const DATA_TEST_SUBJ_SETTING_DEFINITIONS_RETRY = 'settingDefinitionsLoadErrorRetry';

export interface SettingDefinitionsLoadErrorProps {
  /** The `loadError` from {@link useSettingDefinitions} or `useEditableSettings`. */
  error: Error;
  /** The `retry` from {@link useSettingDefinitions} or `useEditableSettings`. */
  onRetry: () => void;
  /** Replaces the default title, "Unable to load settings". */
  title?: string;
  'data-test-subj'?: string;
}

/**
 * The error to render in place of a settings form when its setting definitions fail to load,
 * with an action that fetches them again.
 */
export const SettingDefinitionsLoadError = ({
  error,
  onRetry,
  title,
  'data-test-subj': dataTestSubj,
}: SettingDefinitionsLoadErrorProps) => (
  <KbnDangerCallout
    title={
      title ??
      i18n.translate('management.settings.hooks.loadError.title', {
        defaultMessage: 'Unable to load settings',
      })
    }
    text={error.message}
    actionProps={{
      primary: {
        children: i18n.translate('management.settings.hooks.loadError.retryButton', {
          defaultMessage: 'Try again',
        }),
        onClick: onRetry,
        'data-test-subj': DATA_TEST_SUBJ_SETTING_DEFINITIONS_RETRY,
      },
    }}
    data-test-subj={dataTestSubj}
  />
);

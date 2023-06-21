/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import copy from 'copy-to-clipboard';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import { COPY_CELL_ACTION_TYPE } from '../../constants';
import { createCellActionFactory } from '../factory';

const ICON = 'copyClipboard';
const COPY_TO_CLIPBOARD = i18n.translate('cellActions.actions.copyToClipboard.displayName', {
  defaultMessage: 'Copy to Clipboard',
});
const COPY_TO_CLIPBOARD_SUCCESS = i18n.translate(
  'cellActions.actions.copyToClipboard.successMessage',
  {
    defaultMessage: 'Copied to the clipboard',
  }
);

const escapeValue = (value: string) => value.replace(/"/g, '\\"');

export const createCopyToClipboardActionFactory = createCellActionFactory(
  ({ notifications }: { notifications: NotificationsStart }) => ({
    type: COPY_CELL_ACTION_TYPE,
    getIconType: () => ICON,
    getDisplayName: () => COPY_TO_CLIPBOARD,
    getDisplayNameTooltip: () => COPY_TO_CLIPBOARD,
    isCompatible: async ({ field }) => field.name != null,
    execute: async ({ field }) => {
      let textValue: undefined | string;
      if (field.value != null) {
        textValue = Array.isArray(field.value)
          ? field.value.map((value) => `"${escapeValue(value)}"`).join(' AND ')
          : `"${escapeValue(field.value)}"`;
      }
      const text = textValue ? `${field.name}: ${textValue}` : field.name;
      const isSuccess = copy(text, { debug: true });

      if (isSuccess) {
        notifications.toasts.addSuccess(
          {
            title: COPY_TO_CLIPBOARD_SUCCESS,
          },
          {
            toastLifeTimeMs: 800,
          }
        );
      }
    },
  })
);

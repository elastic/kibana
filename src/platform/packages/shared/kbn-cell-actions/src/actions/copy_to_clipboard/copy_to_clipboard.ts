/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import copy from 'copy-to-clipboard';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import { isString } from 'lodash/fp';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { COPY_CELL_ACTION_TYPE } from '../../constants';
import { createCellActionFactory } from '../factory';
import {
  filterOutNullableValues,
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  valueToArray,
} from '../utils';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '../translations';

const ICON = 'copyClipboard';
const COPY_TO_CLIPBOARD = i18n.translate('cellActions.actions.copyToClipboard.displayName', {
  defaultMessage: 'Copy to clipboard',
});
const COPY_TO_CLIPBOARD_SUCCESS = i18n.translate(
  'cellActions.actions.copyToClipboard.successMessage',
  {
    defaultMessage: 'Copied to the clipboard',
  }
);

const escapeValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const createCopyToClipboardActionFactory = createCellActionFactory(
  ({ notifications }: { notifications: NotificationsStart }) => ({
    type: COPY_CELL_ACTION_TYPE,
    getIconType: () => ICON,
    getDisplayName: () => COPY_TO_CLIPBOARD,
    getDisplayNameTooltip: () => COPY_TO_CLIPBOARD,
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 && // TODO Add support for multiple values
        field.name != null &&
        isTypeSupportedByDefaultActions(field.type as KBN_FIELD_TYPES)
      );
    },
    execute: async ({ data }) => {
      const field = data[0]?.field;
      const rawValue = data[0]?.value;
      const value = filterOutNullableValues(valueToArray(rawValue));

      if (!isValueSupportedByDefaultActions(value)) {
        notifications.toasts.addWarning({
          title: ACTION_INCOMPATIBLE_VALUE_WARNING,
        });
        return;
      }

      const textValue = value.map((v) => (isString(v) ? `"${escapeValue(v)}"` : v)).join(' AND ');
      const text = textValue !== '' ? `${field.name}: ${textValue}` : field.name;
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

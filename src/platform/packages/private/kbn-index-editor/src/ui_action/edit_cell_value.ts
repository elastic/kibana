/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createCellActionFactory } from '@kbn/cell-actions/src/actions';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

import {
  filterOutNullableValues,
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  valueToArray,
} from '@kbn/cell-actions/src/actions/utils';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import { isString } from 'lodash/fp';
import copy from 'copy-to-clipboard';
import type { Trigger } from '@kbn/ui-actions-browser';
import { i18n } from '@kbn/i18n';

export const EDIT_CELL_VALUE_TRIGGER_ID = 'EDIT_CELL_VALUE_TRIGGER_ID';

export const EDIT_CELL_VALUE_TRIGGER: Trigger = {
  id: EDIT_CELL_VALUE_TRIGGER_ID,
  title: 'Edit Lookup Index',
  description: 'This trigger is used to edit the lookup index content.',
} as const;

export const ACTION_EDIT_CELL_VALUE_INDEX = 'ACTION_EDIT_CELL_VALUE_INDEX';

const description = i18n.translate('indexEditor.dataGrid.editCellDescription', {
  defaultMessage: 'Edit value',
});

export const createEditCellValueActionFactory = createCellActionFactory(
  ({ notifications }: { notifications: NotificationsStart }) => ({
    type: ACTION_EDIT_CELL_VALUE_INDEX,
    getIconType: () => 'pencil',
    getDisplayName: () => description,
    getDisplayNameTooltip: () => description,
    isCompatible: async ({ data }) => {
      return true;
      // Only support scalar values for now
      // TODO
      //  - check is ES index is open
      //  - check if the user has permissions to edit the index
      const field = data[0]?.field;

      return (
        data.length === 1 && // TODO Add support for multiple values
        field.name != null &&
        isTypeSupportedByDefaultActions(field.type as KBN_FIELD_TYPES)
      );
    },
    execute: async ({ data }) => {
      return;

      // create a popover with an input field to edit the value
      // best would be to create a portal to render an input based on the position
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

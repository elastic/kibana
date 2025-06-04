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
import React from 'react';
import ReactDOM from 'react-dom';

import { isTypeSupportedByDefaultActions } from '@kbn/cell-actions/src/actions/utils';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type { Trigger } from '@kbn/ui-actions-browser';
import { EditCellValue } from '../components/value_input_control';
import { IndexUpdateService } from '../index_update_service';
import { or } from '../../../../../../../bazel-kibana/x-pack/solutions/security/plugins/lists/server/services/exception_lists/exception_list_client';

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
  ({
    notifications,
    indexUpdateService,
  }: {
    notifications: NotificationsStart;
    indexUpdateService: IndexUpdateService;
  }) => ({
    type: ACTION_EDIT_CELL_VALUE_INDEX,
    getIconType: () => 'pencil',
    getDisplayName: () => description,
    getDisplayNameTooltip: () => description,
    isCompatible: async ({ data, metadata }) => {
      console.log(data, '___data___');

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
    execute: async ({ data, metadata, nodeRef }) => {
      // const container = document.createElement('div');
      // document.body.appendChild(nodeRef.current || container);

      // Save the original content so it can be restored later
      const originalContent = nodeRef.current?.innerHTML || '';

      const fieldName = data[0]?.field?.name;
      const docId = '';

      const onClose = () => {
        ReactDOM.unmountComponentAtNode(nodeRef.current);
        // document.body.removeChild(container);
      };

      const onSave = (updatedValue: any) => {
        console.log(updatedValue, '______updatedValue______');

        // Index document
        indexUpdateService.updateDoc(docId, {
          [fieldName]: updatedValue,
        });
      };

      ReactDOM.render(
        <EditCellValue value={data[0].value} onCancel={onClose} onSave={onSave} ref={nodeRef} />,
        nodeRef.current
      );

      console.log(metadata, '___metadata___');
      console.log(nodeRef, '___nodeRef___');
      console.log(data, '___data__123213_');

      // create a popover with an input field to edit the value
      // best would be to create a portal to render an input based on the position
    },
  })
);

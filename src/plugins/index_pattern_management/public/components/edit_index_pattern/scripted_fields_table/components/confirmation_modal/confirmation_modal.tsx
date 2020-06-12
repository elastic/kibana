/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EUI_MODAL_CONFIRM_BUTTON, EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { ScriptedFieldItem } from '../../types';

interface DeleteScritpedFieldConfirmationModalProps {
  field: ScriptedFieldItem;
  hideDeleteConfirmationModal: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  deleteField: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const DeleteScritpedFieldConfirmationModal = ({
  field,
  hideDeleteConfirmationModal,
  deleteField,
}: DeleteScritpedFieldConfirmationModalProps) => {
  const title = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteFieldLabel',
    {
      defaultMessage: "Delete scripted field '{fieldName}'?",
      values: { fieldName: field.name },
    }
  );
  const cancelButtonText = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteField.cancelButton',
    { defaultMessage: 'Cancel' }
  );
  const confirmButtonText = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteField.deleteButton',
    { defaultMessage: 'Delete' }
  );

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={title}
        onCancel={hideDeleteConfirmationModal}
        onConfirm={deleteField}
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
        defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      />
    </EuiOverlayMask>
  );
};

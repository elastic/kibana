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
import PropTypes from 'prop-types';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiOverlayMask, EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

interface DeleteFilterConfirmationModalProps {
  filterToDeleteValue: string;
  onCancelConfirmationModal: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onDeleteFilter: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const DeleteFilterConfirmationModal = ({
  filterToDeleteValue,
  onCancelConfirmationModal,
  onDeleteFilter,
}: DeleteFilterConfirmationModalProps) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.source.deleteSourceFilterLabel"
            defaultMessage="Delete source filter '{value}'?"
            values={{
              value: filterToDeleteValue,
            }}
          />
        }
        onCancel={onCancelConfirmationModal}
        onConfirm={onDeleteFilter}
        cancelButtonText={
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.source.deleteFilter.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        buttonColor="danger"
        confirmButtonText={
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.source.deleteFilter.deleteButtonLabel"
            defaultMessage="Delete"
          />
        }
        defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      />
    </EuiOverlayMask>
  );
};

DeleteFilterConfirmationModal.propTypes = {
  filterToDeleteValue: PropTypes.string.isRequired,
  onCancelConfirmationModal: PropTypes.func.isRequired,
  onDeleteFilter: PropTypes.func.isRequired,
};

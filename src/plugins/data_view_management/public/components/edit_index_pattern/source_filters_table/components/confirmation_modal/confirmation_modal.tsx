/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

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
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="indexPatternManagement.editIndexPattern.source.deleteSourceFilterLabel"
          defaultMessage="Delete field filter '{value}'?"
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
  );
};

DeleteFilterConfirmationModal.propTypes = {
  filterToDeleteValue: PropTypes.string.isRequired,
  onCancelConfirmationModal: PropTypes.func.isRequired,
  onDeleteFilter: PropTypes.func.isRequired,
};

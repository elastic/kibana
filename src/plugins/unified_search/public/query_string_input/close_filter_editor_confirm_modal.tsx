/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiConfirmModal } from '@elastic/eui';

interface CloseFilterEditorConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const CloseFilterEditorConfirmModal = memo(function CloseFilterEditorConfirmModal(
  props: CloseFilterEditorConfirmModalProps
) {
  return (
    <EuiConfirmModal
      title="Close Filter Builder"
      cancelButtonText="Cancel"
      confirmButtonText="Close"
      buttonColor="danger"
      defaultFocusedButton="confirm"
      {...props}
    >
      <p>Filter will be removed on close.</p>
      <p>Are you sure you want to do this?</p>
    </EuiConfirmModal>
  );
});

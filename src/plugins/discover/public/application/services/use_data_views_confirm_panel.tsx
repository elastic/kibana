/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { EuiConfirmModal } from '@elastic/eui';

let isOpen = false;

export function showConfirmPanel({
  I18nContext,
  onConfirm,
  onCancel,
}: {
  I18nContext: I18nStart['Context'];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (isOpen) {
    return;
  }

  isOpen = true;
  const container = document.createElement('div');
  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    isOpen = false;
  };

  document.body.appendChild(container);
  const element = (
    <I18nContext>
      <EuiConfirmModal
        title="Persist temporary index pattern"
        onCancel={() => {
          onClose();
          onCancel();
        }}
        onConfirm={() => {
          onClose();
          onConfirm();
        }}
        cancelButtonText="Cancel"
        confirmButtonText="Confirm"
        defaultFocusedButton="confirm"
      >
        <p>To continue the temporary index pattern needs to be persisted.</p>
        <p>If you confirm this is done automatically.</p>
      </EuiConfirmModal>
    </I18nContext>
  );
  ReactDOM.render(element, container);
}

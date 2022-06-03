/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

interface Props {
  onClose: () => void;
}

export function DevToolsVariablesModal({ onClose }: Props) {
  return (
    <EuiModal data-test-subj="devToolsVariablesModal" onClose={onClose} style={{ width: 800 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="console.variablesPage.pageTitle"
            defaultMessage="Console Variables"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>Variables</EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="variablesCancelButton">
          <FormattedMessage id="console.variablesPage.cancelButtonLabel" defaultMessage="Cancel" />
        </EuiButtonEmpty>

        <EuiButton fill data-test-subj="variables-save-button">
          <FormattedMessage id="console.variablesPage.saveButtonLabel" defaultMessage="Save" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

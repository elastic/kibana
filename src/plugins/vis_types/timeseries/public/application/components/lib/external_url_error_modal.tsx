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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextColor,
} from '@elastic/eui';

interface ExternalUrlErrorModalProps {
  url: string;
  handleClose: () => void;
}

export const ExternalUrlErrorModal = ({ url, handleClose }: ExternalUrlErrorModalProps) => (
  <EuiModal onClose={handleClose}>
    <EuiModalHeader>
      <EuiModalHeaderTitle>
        <FormattedMessage
          id="visTypeTimeseries.externalUrlErrorModal.headerTitle"
          defaultMessage="Access to this external URL is not yet enabled"
        />
      </EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>
      <FormattedMessage
        id="visTypeTimeseries.externalUrlErrorModal.bodyMessage"
        defaultMessage="Configure {externalUrlPolicy} in your {kibanaConfigFileName} to allow access to {url}."
        values={{
          url: (
            <EuiTextColor color="warning" component="span">
              {url}
            </EuiTextColor>
          ),
          externalUrlPolicy: 'externalUrl.policy',
          kibanaConfigFileName: 'kibana.yml',
        }}
      />
    </EuiModalBody>
    <EuiModalFooter>
      <EuiButton onClick={handleClose} fill>
        <FormattedMessage
          id="visTypeTimeseries.externalUrlErrorModal.closeButtonLabel"
          defaultMessage="Close"
        />
      </EuiButton>
    </EuiModalFooter>
  </EuiModal>
);

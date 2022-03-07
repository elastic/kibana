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
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';

interface Props {
  request: string;
  title: string;
  description: string;
  closeFlyout: () => void;
}

export const ViewApiRequest: React.FunctionComponent<Props> = ({ request, title, description, closeFlyout }) => {
  return (
    <EuiFlyout maxWidth={480} onClose={closeFlyout}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          <p>{description}</p>
        </EuiText>
        <EuiSpacer />
        <EuiCodeBlock language="json" isCopyable data-test-subj="apiRequestFlyoutBody">
          {request}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty
          iconType="cross"
          onClick={closeFlyout}
          flush="left"
          data-test-subj="apiRequestFlyoutClose"
        >
          <FormattedMessage
            id="esUi.viewApiRequest.closeButtonLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

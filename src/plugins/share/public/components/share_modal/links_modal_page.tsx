/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCodeBlock, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

interface LinksModalPageProps {
  isEmbedded: boolean;
  allowShortUrl: boolean;
  objectType: string;
}

export const LinksModalPage: FC<LinksModalPageProps> = (props: LinksModalPageProps) => {
  return (
    <EuiForm>
      <EuiSpacer />
      <EuiFormRow
        helpText={
          <FormattedMessage
            id="plugins.share.linkModalPage.saveWorkDescription"
            defaultMessage="One or more panels on this dashboard have changed. Before you generate a snapshot, save the dashboard."
          />
        }
      >
        <EuiCodeBlock isCopyable>
          <EuiSpacer size="xs" />
          placeholder saved objects href
        </EuiCodeBlock>
      </EuiFormRow>
    </EuiForm>
  );
};

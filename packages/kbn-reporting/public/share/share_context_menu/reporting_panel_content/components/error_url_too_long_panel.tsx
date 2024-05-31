/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiText } from '@elastic/eui';

interface Props {
  isUnsaved?: boolean;
}

const i18nTexts = {
  title: i18n.translate('reporting.share.panelContent.unsavedStateAndExceedsMaxLengthTitle', {
    defaultMessage: 'URL too long',
  }),
};

export const ErrorUrlTooLongPanel: FunctionComponent<Props> = ({ isUnsaved }) => (
  <EuiCallOut title={i18nTexts.title} size="s" iconType="warning" color="danger">
    <EuiText size="s">
      <p>
        {isUnsaved ? (
          <span data-test-subj="urlTooLongTrySavingMessage">
            <FormattedMessage
              id="reporting.share.panelContent.unsavedStateAndExceedsMaxLengthTrySaveDescription"
              defaultMessage="This URL cannot be copied. Try saving your work."
            />
          </span>
        ) : (
          // Reaching this state is essentially just an error and should result in a user contacting us.
          <span data-test-subj="urlTooLongErrorMessage">
            <FormattedMessage
              id="reporting.share.panelContent.unsavedStateAndExceedsMaxLengthDescription"
              defaultMessage="This URL cannot be copied."
            />
          </span>
        )}
      </p>
    </EuiText>
  </EuiCallOut>
);

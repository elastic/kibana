/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CommonProps } from '@elastic/eui';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface DraftModeCalloutProps extends CommonProps {
  message?: React.ReactNode;
  node?: React.ReactNode;
}

const defaultCalloutMessage = (
  <FormattedMessage
    id="share.draftModeCallout.message"
    defaultMessage="This link might not be permanent. Save your changes to ensure it works as expected."
  />
);

/**
 * A warning callout to indicate the user has unsaved changes.
 */
export const DraftModeCallout = ({
  node,
  message = defaultCalloutMessage,
  ['data-test-subj']: dataTestSubj = 'unsavedChangesDraftModeCallOut',
}: DraftModeCalloutProps) => {
  return node ? (
    node
  ) : (
    <EuiCallOut
      announceOnMount
      data-test-subj={dataTestSubj}
      color="warning"
      iconType="warning"
      title={i18n.translate('share.draftModeCallout.title', {
        defaultMessage: 'You have unsaved changes',
      })}
    >
      <EuiText component="p" size="s">
        {message}
      </EuiText>
    </EuiCallOut>
  );
};

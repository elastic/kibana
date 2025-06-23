/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiLink, EuiText } from '@elastic/eui';

export const EmptyPrompt: FC<{ inputRef: React.RefObject<HTMLInputElement> }> = ({ inputRef }) => {
  const uploading = (
    <EuiLink
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.click();
      }}
    >
      <FormattedMessage id="indexEditor.emptyPrompt.uploadingLink" defaultMessage="uploading" />
    </EuiLink>
  );

  return (
    <EuiEmptyPrompt
      body={
        <p>
          <EuiText color="subdued" textAlign="center" size="s">
            <FormattedMessage
              id="indexEditor.emptyPrompt.description"
              defaultMessage="Start creating your lookup index by adding cells to the table, by {uploading} or dragging and dropping a file."
              values={{ uploading }}
            />
          </EuiText>
        </p>
      }
    />
  );
};

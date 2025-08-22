/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIndexService } from '../hooks/use_index_service';
import { useFileSelectorContext } from './file_drop_zone';

export const FilePicker = () => {
  const { onFileSelectorClick } = useFileSelectorContext();
  const { canEditIndex } = useIndexService();

  return (
    <EuiButton
      data-test-subj="indexEditorFilePickerButton"
      size={'s'}
      color={'text'}
      onClick={() => {
        onFileSelectorClick();
      }}
      iconType="importAction"
      aria-label={i18n.translate('indexEditor.filePicker.uploadButtonAriaLabel', {
        defaultMessage: 'Upload file button',
      })}
      disabled={canEditIndex === false}
    >
      <EuiText size="xs">
        <FormattedMessage
          id="indexEditor.filePicker.uploadButtonLabel"
          defaultMessage="Upload file"
        />
      </EuiText>
    </EuiButton>
  );
};

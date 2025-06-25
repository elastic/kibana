/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFileSelectorContext } from './file_drop_zone';

export const FilePicker = () => {
  const { onFileSelectorClick } = useFileSelectorContext();

  return (
    <EuiButtonIcon
      display="fill"
      size={'s'}
      color={'text'}
      onClick={() => {
        onFileSelectorClick();
      }}
      iconType="export"
      aria-label={i18n.translate('indexEditor.filePicker.uploadButtonAriaLabel', {
        defaultMessage: 'Upload file button',
      })}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type KeyboardEvent } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCommentsState } from './comments_context';

const DISPLAY_NAME_MAX_LENGTH = 120;

export const useDisplayName = (): [string, (value: string) => void] => {
  const author = useCommentsState((state) => state.author);
  const [edited, setEdited] = useState<string | null>(null);
  return [edited ?? author?.displayName ?? '', setEdited];
};

export const DisplayNameField = ({
  value,
  onChange,
  onKeyDown,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** While the text is being submitted. */
  readOnly?: boolean;
}) => (
  <EuiFieldText
    compressed
    fullWidth
    prepend={i18n.translate('devComments.displayName.postAs', {
      defaultMessage: 'Post as',
    })}
    value={value}
    maxLength={DISPLAY_NAME_MAX_LENGTH}
    readOnly={readOnly}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={onKeyDown}
    placeholder={i18n.translate('devComments.displayName.placeholder', {
      defaultMessage: 'Your name',
    })}
    aria-label={i18n.translate('devComments.displayName.label', {
      defaultMessage: 'Display name',
    })}
    data-test-subj="devCommentsDisplayName"
  />
);

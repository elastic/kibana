/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { i18nTexts } from '../i18n_texts';

interface Props {
  onClick: () => void;
}

export const ClearButton: FunctionComponent<Props> = ({ onClick }) => {
  return (
    <EuiButtonEmpty size="s" data-test-subj="clearButton" onClick={onClick} color="primary">
      {i18nTexts.clear}
    </EuiButtonEmpty>
  );
};

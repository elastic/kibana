/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18nTexts } from '../i18n_texts';

export const EmptyPrompt: FunctionComponent = () => {
  return (
    <EuiEmptyPrompt
      title={<h3>{i18nTexts.emptyPromptTitle}</h3>}
      body={i18nTexts.emptyPromptDescription}
    />
  );
};

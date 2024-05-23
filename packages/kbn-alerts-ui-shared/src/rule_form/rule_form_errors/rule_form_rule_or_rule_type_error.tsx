/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import {
  RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT,
  RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE,
} from '../translations';

export const RuleFormRuleOrRuleTypeError = () => {
  return (
    <EuiEmptyPrompt
      color="danger"
      iconType="error"
      title={<h2>{RULE_FORM_RULE_NOT_FOUND_ERROR_TITLE}</h2>}
      body={
        <EuiText>
          <p>{RULE_FORM_RULE_NOT_FOUND_ERROR_TEXT}</p>
        </EuiText>
      }
    />
  );
};

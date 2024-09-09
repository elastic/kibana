/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { ADD_ACTION_TEXT } from '../translations';

export interface RuleActionsProps {
  onClick: () => void;
}

export const RuleActions = (props: RuleActionsProps) => {
  const { onClick } = props;
  return (
    <div data-test-subj="ruleActions">
      <EuiButton
        iconType="push"
        iconSide="left"
        onClick={onClick}
        data-test-subj="ruleActionsAddActionButton"
      >
        {ADD_ACTION_TEXT}
      </EuiButton>
    </div>
  );
};

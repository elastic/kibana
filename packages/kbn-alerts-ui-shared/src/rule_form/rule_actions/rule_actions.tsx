/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    <>
      <EuiButton iconType="push" iconSide="left" onClick={onClick}>
        {ADD_ACTION_TEXT}
      </EuiButton>
      <div>
        Action form is WIP. You can only create a rule without actions in this version of the form.
      </div>
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPageTemplate, EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRuleFormSelector, useRuleFormDispatch } from '../hooks';
import { setRuleName } from '../features/rule_details/slice';
import { RuleFormPageHeader } from './header';
import { RuleDetails } from '../features/rule_details/rule_details';
import { RuleTypeModel } from '../types';
import { RuleDefinition } from '../features/rule_definition/rule_definition';

export interface RuleFormPageProps {
  referrer: string;
  ruleTypeModel: RuleTypeModel;
}

export const RuleFormPage: React.FC<RuleFormPageProps> = ({ referrer, ruleTypeModel }) => {
  const ruleName = useRuleFormSelector((state) => state.ruleDetails.name);
  const dispatch = useRuleFormDispatch();

  return (
    <>
      <RuleFormPageHeader
        ruleName={ruleName}
        onChangeName={(name) => dispatch(setRuleName(name))}
      />
      <EuiPageTemplate.Section>
        <EuiSteps
          steps={[
            {
              title: 'Rule definition',
              children: <RuleDefinition ruleTypeModel={ruleTypeModel} />,
            },
            {
              title: 'Actions',
              children: <div>Step 2</div>,
            },
            {
              title: 'Rule details',
              children: <RuleDetails />,
            },
          ]}
        />
      </EuiPageTemplate.Section>
    </>
  );
};

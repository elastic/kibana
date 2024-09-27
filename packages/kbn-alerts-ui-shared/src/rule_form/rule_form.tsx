/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { CreateRuleForm } from './create_rule_form';
import { EditRuleForm } from './edit_rule_form';
import {
  RULE_FORM_ROUTE_PARAMS_ERROR_TITLE,
  RULE_FORM_ROUTE_PARAMS_ERROR_TEXT,
} from './translations';
import { RuleFormPlugins } from './types';

const queryClient = new QueryClient();

export interface RuleFormProps {
  plugins: RuleFormPlugins;
  returnUrl: string;
}

export const RuleForm = (props: RuleFormProps) => {
  const { plugins, returnUrl } = props;
  const { id, ruleTypeId } = useParams<{
    id?: string;
    ruleTypeId?: string;
  }>();

  const ruleFormComponent = useMemo(() => {
    if (id) {
      return <EditRuleForm id={id} plugins={plugins} returnUrl={returnUrl} />;
    }
    if (ruleTypeId) {
      return <CreateRuleForm ruleTypeId={ruleTypeId} plugins={plugins} returnUrl={returnUrl} />;
    }
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={<h2>{RULE_FORM_ROUTE_PARAMS_ERROR_TITLE}</h2>}
      >
        <EuiText>
          <p>{RULE_FORM_ROUTE_PARAMS_ERROR_TEXT}</p>
        </EuiText>
      </EuiEmptyPrompt>
    );
  }, [id, ruleTypeId, plugins, returnUrl]);

  return <QueryClientProvider client={queryClient}>{ruleFormComponent}</QueryClientProvider>;
};

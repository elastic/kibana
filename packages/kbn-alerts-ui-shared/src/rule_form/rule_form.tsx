/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { CreateRuleForm, CreateRuleFormProps } from './create_rule_form';
import { EditRuleForm, EditRuleFormProps } from './edit_rule_form';

const queryClient = new QueryClient();

const isCreate = (props: CreateRuleFormProps | EditRuleFormProps): props is CreateRuleFormProps => {
  return (props as CreateRuleFormProps).consumer !== undefined;
};

export const RuleForm = (props: CreateRuleFormProps | EditRuleFormProps) => {
  const ruleFormComponent = useMemo(() => {
    if (isCreate(props)) {
      return <CreateRuleForm {...props} />;
    } else {
      return <EditRuleForm {...props} />;
    }
  }, [props]);

  return <QueryClientProvider client={queryClient}>{ruleFormComponent}</QueryClientProvider>;
};

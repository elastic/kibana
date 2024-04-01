/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { RuleFormPage } from './rule_form_page';
import { initializeStore } from '../store';
import type { RuleTypeModel } from '../types';

export const RuleFormPageComponent: React.FC<{ ruleTypeModel: RuleTypeModel }> = ({
  ruleTypeModel,
}) => {
  const store = useRef(
    initializeStore({
      ruleDetails: { name: `${ruleTypeModel.name} rule`, tags: [] },
    })
  );

  return (
    <Provider store={store.current}>
      <RuleFormPage ruleTypeModel={ruleTypeModel} />
    </Provider>
  );
};

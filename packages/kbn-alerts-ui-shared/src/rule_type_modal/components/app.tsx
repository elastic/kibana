/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { useRuleTypes } from '../hooks';
import { RuleTypeModal, type RuleTypeModalProps } from './modal';

export interface RuleTypeModalComponentProps extends RuleTypeModalProps {
  http: HttpStart;
  toasts: ToastsStart;
  filteredRuleTypes: string[];
  registeredRuleTypes: Array<{ id: string; description: string }>;
}

const EMPTY_ARRAY: string[] = [];

export const RuleTypeModalComponent: React.FC<RuleTypeModalComponentProps> = ({
  http,
  toasts,
  filteredRuleTypes = EMPTY_ARRAY,
  registeredRuleTypes,
  ...props
}) => {
  const {
    ruleTypesState: { data: ruleTypes, isLoading: ruleTypesLoading },
  } = useRuleTypes({
    http,
    toasts,
    filteredRuleTypes,
    registeredRuleTypes,
  });

  return <RuleTypeModal {...props} ruleTypeIndex={ruleTypes} ruleTypesLoading={ruleTypesLoading} />;
};

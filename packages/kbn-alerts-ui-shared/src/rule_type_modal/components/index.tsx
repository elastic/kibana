/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import React, { useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { useLoadRuleTypesQuery } from '../../common/hooks';
import { RuleTypeModal, type RuleTypeModalProps } from './rule_type_modal';
import { filterAndCountRuleTypes } from './helpers/filter_and_count_rule_types';

export interface RuleTypeModalComponentProps {
  http: HttpStart;
  toasts: ToastsStart;
  filteredRuleTypes: string[];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  onClose: RuleTypeModalProps['onClose'];
  onSelectRuleType: RuleTypeModalProps['onSelectRuleType'];
}

const EMPTY_ARRAY: string[] = [];

export const RuleTypeModalComponent: React.FC<RuleTypeModalComponentProps> = ({
  http,
  toasts,
  filteredRuleTypes = EMPTY_ARRAY,
  registeredRuleTypes,
  ...rest
}) => {
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);
  const [searchString, setSearchString] = useState<string>('');

  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: ruleTypesLoading },
  } = useLoadRuleTypesQuery({
    http,
    toasts,
    filteredRuleTypes,
    registeredRuleTypes,
  });

  const [ruleTypes, ruleTypeCountsByProducer] = useMemo(
    () => filterAndCountRuleTypes(ruleTypeIndex, selectedProducer, searchString),
    [ruleTypeIndex, searchString, selectedProducer]
  );

  const hasOnlyOneProducer = useMemo(
    () => Object.keys(omit(ruleTypeCountsByProducer, 'total')).length === 1,
    [ruleTypeCountsByProducer]
  );

  return (
    <RuleTypeModal
      {...rest}
      ruleTypes={ruleTypes}
      ruleTypeCountsByProducer={ruleTypeCountsByProducer}
      ruleTypesLoading={ruleTypesLoading}
      onChangeSearch={setSearchString}
      onFilterByProducer={setSelectedProducer}
      selectedProducer={selectedProducer}
      searchString={searchString}
      showCategories={!hasOnlyOneProducer}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { countBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { useLoadRuleTypesQuery } from '@kbn/alerts-ui-shared';
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

  // Count producers before filtering. This is used to determine if we should show the categories,
  // and categories should only be hidden if there is only one producer BEFORE filters are applied,
  // e.g. on oblt serverless
  const hasOnlyOneProducer = useMemo(() => {
    const producerCount = countBy([...ruleTypeIndex.values()], 'producer');
    return Object.keys(producerCount).length === 1;
  }, [ruleTypeIndex]);

  const [ruleTypes, ruleTypeCountsByProducer] = useMemo(
    () => filterAndCountRuleTypes(ruleTypeIndex, selectedProducer, searchString),
    [ruleTypeIndex, searchString, selectedProducer]
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

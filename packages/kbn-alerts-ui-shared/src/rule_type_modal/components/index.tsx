/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import { countBy } from 'lodash';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { useRuleTypes } from '../hooks';
import { RuleTypeModal, type RuleTypeModalProps } from './rule_type_modal';

export interface RuleTypeModalComponentProps
  extends Pick<RuleTypeModalProps, 'onClose' | 'onSelectRuleType'> {
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
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);
  const [searchString, setSearchString] = useState<string>('');

  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: ruleTypesLoading },
  } = useRuleTypes({
    http,
    toasts,
    filteredRuleTypes,
    registeredRuleTypes,
  });

  const [ruleTypes, ruleTypesCountsByProducer] = useMemo(() => {
    if (!ruleTypeIndex) return [[], { total: 0 }];
    const ruleTypeValues = [...ruleTypeIndex.values()];
    const ruleTypesFilteredBySearch = ruleTypeValues.filter((ruleType) => {
      if (searchString) {
        return (
          ruleType.name.toLowerCase().includes(searchString.toLowerCase()) ||
          (ruleType.description &&
            ruleType.description.toLowerCase().includes(searchString.toLowerCase()))
        );
      }
      return true;
    });
    const ruleTypesFilteredBySearchAndProducer = ruleTypesFilteredBySearch.filter((ruleType) => {
      if (selectedProducer && ruleType.producer !== selectedProducer) return false;
      return true;
    });
    return [
      ruleTypesFilteredBySearchAndProducer,
      {
        ...countBy(ruleTypesFilteredBySearch, 'producer'),
        total: ruleTypesFilteredBySearch.length,
      },
    ];
  }, [ruleTypeIndex, searchString, selectedProducer]);

  return (
    <RuleTypeModal
      {...props}
      ruleTypes={ruleTypes}
      ruleTypesCountsByProducer={ruleTypesCountsByProducer}
      ruleTypesLoading={ruleTypesLoading}
      onChangeSearch={setSearchString}
      onFilterByProducer={setSelectedProducer}
      selectedProducer={selectedProducer}
      searchString={searchString}
    />
  );
};

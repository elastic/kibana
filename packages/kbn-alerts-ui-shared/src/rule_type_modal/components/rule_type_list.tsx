/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFacetGroup,
  EuiFacetButton,
  EuiCard,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import { omit } from 'lodash';
import { PRODUCER_DISPLAY_NAMES } from '../../common/i18n';
import { RuleTypeWithDescription, RuleTypeCountsByProducer } from '../types';

interface RuleTypeListProps {
  ruleTypes: RuleTypeWithDescription[];
  onSelectRuleType: (ruleTypeId: string) => void;
  onFilterByProducer: (producer: string | null) => void;
  selectedProducer: string | null;
  ruleTypeCountsByProducer: RuleTypeCountsByProducer;
  onClearFilters: () => void;
  showCategories: boolean;
}

const producerToDisplayName = (producer: string) => {
  return Reflect.get(PRODUCER_DISPLAY_NAMES, producer) ?? producer;
};

/**
 * Sorts an array of objects (ruleTypes) based on two criteria:
 * 1. First, sorts by the 'enabledInLicense' property.
 *    - If 'enabledInLicense' is the same for both rules (a and b),
 *      it sorts them based on the 'name' property using locale-sensitive string comparison.
 * 2. If 'enabledInLicense' is different for a and b,
 *    places the object with 'enabledInLicense' set to true before the one with 'enabledInLicense' set to false.
 */
const sortRuleTypes = (a: RuleTypeWithDescription, b: RuleTypeWithDescription) => {
  if (a.enabledInLicense === b.enabledInLicense) {
    return a.name.localeCompare(b.name);
  }
  return a.enabledInLicense ? -1 : 1;
};

export const RuleTypeList: React.FC<RuleTypeListProps> = ({
  ruleTypes,
  onSelectRuleType,
  onFilterByProducer,
  selectedProducer,
  ruleTypeCountsByProducer,
  onClearFilters,
  showCategories = true,
}) => {
  const ruleTypesList = [...ruleTypes].sort(sortRuleTypes);
  const { euiTheme } = useEuiTheme();

  const facetList = useMemo(
    () =>
      Object.entries(omit(ruleTypeCountsByProducer, 'total'))
        .sort(([, aCount], [, bCount]) => bCount - aCount)
        .map(([producer, count]) => (
          <EuiFacetButton
            key={producer}
            fullWidth
            quantity={count}
            onClick={() => onFilterByProducer(producer)}
            isSelected={selectedProducer === producer}
          >
            {producerToDisplayName(producer)}
          </EuiFacetButton>
        )),
    [ruleTypeCountsByProducer, onFilterByProducer, selectedProducer]
  );

  const onClickAll = useCallback(() => onFilterByProducer(null), [onFilterByProducer]);

  return (
    <EuiFlexGroup
      style={{
        height: '100%',
      }}
    >
      {showCategories && (
        <EuiFlexItem
          grow={1}
          style={{
            paddingTop: euiTheme.size.base /* Match drop shadow padding in the right column */,
          }}
        >
          <EuiFacetGroup>
            <EuiFacetButton
              fullWidth
              quantity={ruleTypeCountsByProducer.total}
              onClick={onClickAll}
              isSelected={!selectedProducer}
            >
              {i18n.translate('alertsUIShared.components.ruleTypeModal.allRuleTypes', {
                defaultMessage: 'All',
              })}
            </EuiFacetButton>
            {facetList}
          </EuiFacetGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem
        grow={3}
        style={{
          overflowY: 'auto',
          padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.xl}`, // Add padding to prevent drop shadow from hovered cards from being cut off
        }}
      >
        {ruleTypesList.length === 0 && (
          <EuiEmptyPrompt
            color="subdued"
            iconType="search"
            title={
              <h2>
                {i18n.translate('alertsUIShared.components.ruleTypeModal.noRuleTypesErrorTitle', {
                  defaultMessage: 'No rule types found',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('alertsUIShared.components.ruleTypeModal.noRuleTypesErrorBody', {
                  defaultMessage: 'Try a different search or change your filter settings',
                })}
                .
              </p>
            }
            actions={
              <EuiButton size="s" color="primary" fill onClick={onClearFilters}>
                Clear filters
              </EuiButton>
            }
          />
        )}
        {ruleTypesList.map((rule) => (
          <React.Fragment key={rule.id}>
            <EuiCard
              titleSize="xs"
              textAlign="left"
              hasBorder
              title={rule.name}
              onClick={() => onSelectRuleType(rule.id)}
              description={
                <>
                  {rule.description}
                  {rule.description && <EuiSpacer size="s" />}
                  <EuiText
                    color="subdued"
                    size="xs"
                    style={{ textTransform: 'uppercase', fontWeight: euiTheme.font.weight.bold }}
                  >
                    {producerToDisplayName(rule.producer)}
                  </EuiText>
                </>
              }
              style={{ marginRight: '8px', flexGrow: 0 }}
              data-test-subj={`${rule.id}-SelectOption`}
              isDisabled={rule.enabledInLicense === false}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

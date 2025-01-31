/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import {
  EuiPageHeader,
  EuiModal,
  EuiPanel,
  EuiPageHeaderSection,
  EuiTitle,
  EuiFieldSearch,
  EuiSpacer,
  useEuiTheme,
  useCurrentEuiBreakpoint,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { RuleTypeList } from './rule_type_list';
import { RuleTypeWithDescription, RuleTypeCountsByProducer } from '../types';

export interface RuleTypeModalProps {
  onClose: () => void;
  onSelectRuleType: (ruleTypeId: string) => void;
  onFilterByProducer: (producer: string | null) => void;
  onChangeSearch: (search: string) => void;
  searchString: string;
  selectedProducer: string | null;
  showCategories: boolean;
}

export interface RuleTypeModalState {
  ruleTypes: RuleTypeWithDescription[];
  ruleTypesLoading: boolean;
  ruleTypeCountsByProducer: RuleTypeCountsByProducer;
}

const loadingPrompt = (
  <EuiEmptyPrompt
    title={
      <h2>
        {i18n.translate('responseOpsRuleForm.components.ruleTypeModal.loadingRuleTypes', {
          defaultMessage: 'Loading rule types',
        })}
      </h2>
    }
    icon={<EuiLoadingSpinner size="xl" />}
  />
);

export const RuleTypeModal: React.FC<RuleTypeModalProps & RuleTypeModalState> = ({
  onClose,
  onSelectRuleType,
  onFilterByProducer,
  onChangeSearch,
  ruleTypes,
  ruleTypesLoading,
  ruleTypeCountsByProducer,
  searchString,
  selectedProducer,
  showCategories,
}) => {
  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const onClearFilters = useCallback(() => {
    onFilterByProducer(null);
    onChangeSearch('');
  }, [onFilterByProducer, onChangeSearch]);

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={euiTheme.breakpoint[currentBreakpoint]}
      style={{
        width: euiTheme.breakpoint[currentBreakpoint],
        maxHeight: isFullscreenPortrait ? 'initial' : '960px',
        height: isFullscreenPortrait ? 'initial' : '80vh',
        overflow: isFullscreenPortrait ? 'auto' : 'hidden',
      }}
      data-test-subj="ruleTypeModal"
    >
      <EuiPanel paddingSize="m" style={!isFullscreenPortrait ? { maxHeight: '100%' } : {}}>
        <EuiFlexGroup direction="column" style={{ height: '100%' }}>
          <EuiFlexItem grow={0}>
            <EuiPageHeader bottomBorder="extended" paddingSize="m">
              <EuiPageHeaderSection style={{ width: '100%' }}>
                <EuiTitle size="s">
                  <h1>
                    {i18n.translate('responseOpsRuleForm.components.ruleTypeModal.title', {
                      defaultMessage: 'Select rule type',
                    })}
                  </h1>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiPageHeaderSection style={{ width: isFullscreenPortrait ? '100%' : '50%' }}>
                  <EuiFieldSearch
                    placeholder={i18n.translate(
                      'responseOpsRuleForm.components.ruleTypeModal.searchPlaceholder',
                      {
                        defaultMessage: 'Search',
                      }
                    )}
                    value={searchString}
                    onChange={({ target: { value } }) => onChangeSearch(value)}
                    fullWidth
                  />
                </EuiPageHeaderSection>
              </EuiPageHeaderSection>
            </EuiPageHeader>
          </EuiFlexItem>
          <EuiFlexItem
            style={{
              overflow: 'hidden',
              marginTop: `-${euiTheme.size.base}`,
            }}
          >
            {ruleTypesLoading ? (
              loadingPrompt
            ) : (
              <RuleTypeList
                ruleTypes={ruleTypes}
                ruleTypeCountsByProducer={ruleTypeCountsByProducer}
                onSelectRuleType={onSelectRuleType}
                onFilterByProducer={onFilterByProducer}
                selectedProducer={selectedProducer}
                onClearFilters={onClearFilters}
                showCategories={showCategories}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiModal>
  );
};

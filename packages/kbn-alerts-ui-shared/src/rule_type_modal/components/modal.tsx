/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiPageHeader,
  EuiModal,
  EuiPanel,
  EuiPageHeaderSection,
  EuiTitle,
  EuiSearchBar,
  EuiSpacer,
  useEuiTheme,
  useCurrentEuiBreakpoint,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { RuleTypeIndex } from '@kbn/triggers-actions-ui-types';
import { RuleTypeList } from './rule_type_list';

export interface RuleTypeModalProps {
  onClose: () => void;
}

export interface RuleTypeModalState {
  ruleTypeIndex: RuleTypeIndex;
  ruleTypesLoading: boolean;
}

export const RuleTypeModal: React.FC<RuleTypeModalProps & RuleTypeModalState> = ({
  onClose,
  ruleTypeIndex,
  ruleTypesLoading,
}) => {
  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const loadingPrompt = (
    <EuiEmptyPrompt title={<h2>Loading rule types</h2>} icon={<EuiLoadingSpinner size="xl" />} />
  );

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
    >
      <EuiPanel paddingSize="m" style={!isFullscreenPortrait ? { maxHeight: '100%' } : {}}>
        <EuiFlexGroup direction="column" style={{ height: '100%' }}>
          <EuiFlexItem grow={0}>
            <EuiPageHeader bottomBorder="extended" paddingSize="m">
              <EuiPageHeaderSection style={{ width: '100%' }}>
                <EuiTitle size="s">
                  <h1>
                    {i18n.translate('alertsUIShared.components.ruleTypeModal.title', {
                      defaultMessage: 'Select rule type',
                    })}
                  </h1>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiPageHeaderSection style={{ width: isFullscreenPortrait ? '100%' : '50%' }}>
                  <EuiSearchBar />
                </EuiPageHeaderSection>
              </EuiPageHeaderSection>
            </EuiPageHeader>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem style={{ overflow: 'hidden' }}>
            {ruleTypesLoading ? loadingPrompt : <RuleTypeList ruleTypeIndex={ruleTypeIndex} />}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiModal>
  );
};

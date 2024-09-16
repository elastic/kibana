/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { RuleSystemAction } from '@kbn/alerting-types';
import { ADD_ACTION_TEXT } from '../translations';
import { RuleActionsConnectorsModal } from './rule_actions_connectors_modal';
import { useRuleFormDispatch, useRuleFormState } from '../hooks';
import { ActionConnector, RuleAction } from '../../common/types';
import { DEFAULT_FREQUENCY, MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';
import { useLoadConnectors, useLoadConnectorTypes } from '../../common/hooks';
import { useLoadRuleTypeAadTemplateField } from '../../common/hooks/use_load_rule_type_aad_template_fields';
import { RuleActionsItem } from './rule_actions_item';
import { RuleActionsSystemActionsItem } from './rule_actions_system_actions_item';

export const RuleActions = () => {
  const [isConnectorModalOpen, setIsConnectorModalOpen] = useState<boolean>(false);

  const {
    plugins: { http },
    formData: { actions, consumer },
    selectedRuleType,
  } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

  const { data: connectors = [], isInitialLoading: isInitialLoadingConnectors } = useLoadConnectors(
    {
      http,
      includeSystemActions: true,
    }
  );

  const { data: connectorTypes = [], isInitialLoading: isInitialLoadingConnectorTypes } =
    useLoadConnectorTypes({
      http,
      includeSystemActions: true,
    });

  const { data: aadTemplateFields, isInitialLoading: isInitialLoadingAadTemplateField } =
    useLoadRuleTypeAadTemplateField({
      http,
      ruleTypeId: selectedRuleType.id,
      enabled: true,
    });

  const onModalOpen = useCallback(() => {
    setIsConnectorModalOpen(true);
  }, []);

  const onModalClose = useCallback(() => {
    setIsConnectorModalOpen(false);
  }, []);

  const onSelectConnector = useCallback(
    (connector: ActionConnector) => {
      const { id, actionTypeId } = connector;
      dispatch({
        type: 'addAction',
        payload: {
          id,
          actionTypeId,
          uuid: uuidv4(),
          params: {},
          group: selectedRuleType.defaultActionGroupId,
          frequency: DEFAULT_FREQUENCY,
        },
      });
      onModalClose();
    },
    [dispatch, onModalClose, selectedRuleType]
  );

  const producerId = useMemo(() => {
    if (MULTI_CONSUMER_RULE_TYPE_IDS.includes(selectedRuleType.id)) {
      return consumer;
    }
    return selectedRuleType.producer;
  }, [consumer, selectedRuleType]);

  const isLoading =
    isInitialLoadingConnectors ||
    isInitialLoadingConnectorTypes ||
    isInitialLoadingAadTemplateField;

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <>
      <EuiFlexGroup data-test-subj="ruleActions" direction="column">
        {actions.map((action, index) => {
          const isSystemAction = connectorTypes.some((connectorType) => {
            return connectorType.id === action.actionTypeId && connectorType.isSystemActionType;
          });

          return (
            <EuiFlexItem key={action.uuid}>
              {isSystemAction && (
                <RuleActionsSystemActionsItem
                  action={action as RuleSystemAction}
                  index={index}
                  producerId={producerId}
                  aadTemplateFields={aadTemplateFields}
                  connectors={connectors}
                  actionTypes={connectorTypes}
                />
              )}
              {!isSystemAction && (
                <RuleActionsItem
                  action={action as RuleAction}
                  index={index}
                  producerId={producerId}
                  aadTemplateFields={aadTemplateFields}
                  connectors={connectors}
                  actionTypes={connectorTypes}
                />
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiButton
        data-test-subj="ruleActionsAddActionButton"
        iconType="push"
        iconSide="left"
        onClick={onModalOpen}
        disabled={isLoading}
        isLoading={isLoading}
      >
        {ADD_ACTION_TEXT}
      </EuiButton>
      {isConnectorModalOpen && (
        <RuleActionsConnectorsModal
          onClose={onModalClose}
          onSelectConnector={onSelectConnector}
          connectors={connectors}
          actionTypes={connectorTypes}
        />
      )}
    </>
  );
};

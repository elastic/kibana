/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { RuleSystemAction } from '@kbn/alerting-types';
import { ADD_ACTION_TEXT } from '../translations';
import { RuleActionsConnectorsModal } from './rule_actions_connectors_modal';
import { useRuleFormDispatch, useRuleFormState } from '../hooks';
import { ActionConnector, RuleAction } from '../../common/types';
import { DEFAULT_FREQUENCY, MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';
import { RuleActionsItem } from './rule_actions_item';
import { RuleActionsSystemActionsItem } from './rule_actions_system_actions_item';

export const RuleActions = () => {
  const [isConnectorModalOpen, setIsConnectorModalOpen] = useState<boolean>(false);

  const {
    formData: { actions, consumer },
    selectedRuleType,
    connectorTypes,
  } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

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
                />
              )}
              {!isSystemAction && (
                <RuleActionsItem
                  action={action as RuleAction}
                  index={index}
                  producerId={producerId}
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
      >
        {ADD_ACTION_TEXT}
      </EuiButton>
      {isConnectorModalOpen && (
        <RuleActionsConnectorsModal onClose={onModalClose} onSelectConnector={onSelectConnector} />
      )}
    </>
  );
};

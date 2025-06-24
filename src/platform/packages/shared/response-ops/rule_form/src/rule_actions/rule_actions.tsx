/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiImage, EuiSpacer, EuiText } from '@elastic/eui';
import { RuleSystemAction } from '@kbn/alerting-types';
import React, { useCallback, useMemo, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { RuleAction } from '../common/types';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../constants';
import { useRuleFormState, useRuleFormScreenContext } from '../hooks';
import {
  ADD_ACTION_DESCRIPTION_TEXT,
  ADD_ACTION_HEADER,
  OPTIONAL_LABEL,
  ADD_ACTION_TEXT,
} from '../translations';
import { RuleActionsItem } from './rule_actions_item';
import { RuleActionsSystemActionsItem } from './rule_actions_system_actions_item';

const useRuleActionsIllustration = () => {
  const [imageData, setImageData] = useState('');
  useEffectOnce(() => {
    const fetchImage = async () => {
      const image = await import('./rule_actions_illustration.svg');
      setImageData(image.default);
    };
    fetchImage();
  });
  return imageData;
};

export const RuleActions = () => {
  const ruleActionsIllustration = useRuleActionsIllustration();
  const { setIsConnectorsScreenVisible } = useRuleFormScreenContext();

  const {
    formData: { actions, consumer },
    multiConsumerSelection,
    selectedRuleType,
    connectorTypes,
  } = useRuleFormState();

  const onModalOpen = useCallback(() => {
    setIsConnectorsScreenVisible(true);
  }, [setIsConnectorsScreenVisible]);

  const producerId = useMemo(() => {
    if (MULTI_CONSUMER_RULE_TYPE_IDS.includes(selectedRuleType.id)) {
      return multiConsumerSelection || consumer;
    }
    return selectedRuleType.producer;
  }, [consumer, multiConsumerSelection, selectedRuleType]);

  const hasActions = actions.length > 0;

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
      {!hasActions && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexGroup
            alignItems="center"
            direction="column"
            gutterSize="m"
            style={{ maxWidth: 356 }}
          >
            <EuiImage
              alt="Rule actions illustration"
              width={198}
              height={180}
              url={ruleActionsIllustration}
            />
            <EuiFlexItem>
              <EuiText textAlign="center">
                <h3>{ADD_ACTION_HEADER}</h3>
              </EuiText>
              <EuiText size="s" textAlign="center" color="subdued">
                {OPTIONAL_LABEL}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" textAlign="center" color="subdued">
                {ADD_ACTION_DESCRIPTION_TEXT}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      )}
      <EuiSpacer />
      <EuiFlexGroup justifyContent={!hasActions ? 'center' : 'flexStart'}>
        <EuiFlexItem grow={0}>
          <EuiButton
            data-test-subj="ruleActionsAddActionButton"
            iconType="push"
            iconSide="left"
            onClick={onModalOpen}
          >
            {ADD_ACTION_TEXT}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

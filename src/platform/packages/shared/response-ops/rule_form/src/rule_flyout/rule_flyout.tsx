/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyout, EuiPortal } from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import type { RuleFormData } from '../types';
import { RuleFormStepId } from '../constants';
import { RuleFlyoutBody } from './rule_flyout_body';
import { RuleFlyoutShowRequest } from './rule_flyout_show_request';
import { useRuleFormScreenContext } from '../hooks';
import { RuleFlyoutSelectConnector } from './rule_flyout_select_connector';

interface RuleFlyoutProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel?: () => void;
  onSave: (formData: RuleFormData) => void;
}

export const RuleFlyout = ({
  onSave,
  isEdit = false,
  isSaving = false,
  onCancel = () => {},
}: RuleFlyoutProps) => {
  const [initialStep, setInitialStep] = useState<RuleFormStepId | undefined>(undefined);

  const {
    isConnectorsScreenVisible,
    isShowRequestScreenVisible,
    setIsShowRequestScreenVisible,
    setIsConnectorsScreenVisible,
  } = useRuleFormScreenContext();
  const onCloseConnectorsScreen = useCallback(() => {
    setInitialStep(RuleFormStepId.ACTIONS);
    setIsConnectorsScreenVisible(false);
  }, [setIsConnectorsScreenVisible]);

  const onOpenShowRequest = useCallback(
    () => setIsShowRequestScreenVisible(true),
    [setIsShowRequestScreenVisible]
  );
  const onCloseShowRequest = useCallback(() => {
    setInitialStep(RuleFormStepId.DETAILS);
    setIsShowRequestScreenVisible(false);
  }, [setIsShowRequestScreenVisible]);

  const hideCloseButton = useMemo(
    () => isShowRequestScreenVisible || isConnectorsScreenVisible,
    [isConnectorsScreenVisible, isShowRequestScreenVisible]
  );

  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        onClose={onCancel}
        aria-labelledby="flyoutTitle"
        size="m"
        maxWidth={500}
        className="ruleFormFlyout__container"
        hideCloseButton={hideCloseButton}
      >
        {isShowRequestScreenVisible ? (
          <RuleFlyoutShowRequest isEdit={isEdit} onClose={onCloseShowRequest} />
        ) : isConnectorsScreenVisible ? (
          <RuleFlyoutSelectConnector onClose={onCloseConnectorsScreen} />
        ) : (
          <RuleFlyoutBody
            onSave={onSave}
            onCancel={onCancel}
            isEdit={isEdit}
            isSaving={isSaving}
            onShowRequest={onOpenShowRequest}
            initialStep={initialStep}
          />
        )}
      </EuiFlyout>
    </EuiPortal>
  );
};

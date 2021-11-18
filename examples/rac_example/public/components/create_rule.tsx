/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiCard } from '@elastic/eui';
import { RAC_EXAMPLE_APP_ID } from '../../common/constants';
import { AlertsDemoClientStartDeps } from '../types';
export const CreateRule = ({
  triggersActionsUi,
}: Pick<AlertsDemoClientStartDeps, 'triggersActionsUi'>) => {
  const [ruleFlyoutVisible, setRuleFlyoutVisible] = useState(false);

  const onCloseRuleFlyout = useCallback(() => {
    return setRuleFlyoutVisible(!ruleFlyoutVisible);
  }, [ruleFlyoutVisible, setRuleFlyoutVisible]);
  const CreateRuleFlyout = useMemo(
    () =>
      triggersActionsUi.getAddAlertFlyout({
        consumer: RAC_EXAMPLE_APP_ID,
        onClose: onCloseRuleFlyout,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCloseRuleFlyout]
  );
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiCard
          title="Create rule"
          description="Create a new Rule based on one of our example Rule Types"
          onClick={() => setRuleFlyoutVisible(!ruleFlyoutVisible)}
        />
      </EuiFlexItem>
      <EuiFlexItem>{ruleFlyoutVisible && CreateRuleFlyout}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

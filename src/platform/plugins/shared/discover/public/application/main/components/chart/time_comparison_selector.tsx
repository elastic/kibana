/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';

export const TimeComparisonSelector = () => {
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const timeComparisonEnabled = useAppStateSelector((state) => state.timeComparisonEnabled ?? false);

  const onToggle = useCallback(() => {
    dispatch(
      updateAppState({ appState: { timeComparisonEnabled: !timeComparisonEnabled || undefined } })
    );
  }, [dispatch, updateAppState, timeComparisonEnabled]);

  if (timeComparisonEnabled) {
    return (
      <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('discover.timeComparison.prefixLabel', {
              defaultMessage: 'Comparison:',
            })}
            &nbsp;
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            color="primary"
            iconType="visLine"
            onClick={onToggle}
            isSelected
            data-test-subj="discoverTimeComparisonToggle"
          >
            {i18n.translate('discover.timeComparison.previousPeriodLabel', {
              defaultMessage: 'Previous period',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiButtonEmpty
      size="xs"
      color="text"
      iconType="visLine"
      onClick={onToggle}
      data-test-subj="discoverTimeComparisonToggle"
    >
      {i18n.translate('discover.timeComparison.inactiveLabel', {
        defaultMessage: 'Comparison',
      })}
    </EuiButtonEmpty>
  );
};

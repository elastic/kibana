/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, FC } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import {
  CIRCUIT_BREAKER_HIDE_FULL_ERROR_TEXT,
  CIRCUIT_BREAKER_SEE_FULL_ERROR_TEXT,
} from '../translations';

export const RuleFormCircuitBreakerError: FC<{}> = ({ children }) => {
  const [showDetails, setShowDetails] = useState(false);

  const onToggleShowDetails = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  return (
    <>
      {showDetails && (
        <>
          <EuiText size="s">{children}</EuiText>
          <EuiSpacer />
        </>
      )}
      <EuiFlexGroup
        justifyContent="flexEnd"
        gutterSize="s"
        data-test-subj="ruleFormCircuitBreakerError"
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="danger"
            onClick={onToggleShowDetails}
            data-test-subj="ruleFormCircuitBreakerErrorToggleButton"
          >
            {showDetails
              ? CIRCUIT_BREAKER_HIDE_FULL_ERROR_TEXT
              : CIRCUIT_BREAKER_SEE_FULL_ERROR_TEXT}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

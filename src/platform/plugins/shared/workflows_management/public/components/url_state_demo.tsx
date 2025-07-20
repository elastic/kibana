/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiCode,
  EuiCallOut,
} from '@elastic/eui';

/**
 * Demo component showing URL state management approaches
 * 
 * Usage examples:
 * 
 * Simple query params (current implementation):
 * URL: /app/workflows/123?tab=executions&executionId=exec-456
 * 
 * Advanced Kibana state (alternative):
 * URL: /app/workflows/123?_w=(tab:executions,executionId:exec-456)
 * 
 * With hashing enabled:
 * URL: /app/workflows/123?_w=h@abc123def
 * (actual state stored in sessionStorage)
 */

export const UrlStateDemo: React.FC = () => {
  return (
    <EuiPanel>
      <EuiTitle size="s">
        <h3>URL State Management in Kibana</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      
      <EuiCallOut title="Implementation Complete" color="success">
        <p>
          Your workflow execution state is now persisted in the URL! 
          Try refreshing the page or sharing the URL - your tab selection and execution details will be preserved.
        </p>
      </EuiCallOut>
      
      <EuiSpacer size="m" />
      
      <EuiTitle size="xs">
        <h4>Two Approaches Available:</h4>
      </EuiTitle>
      
      <EuiSpacer size="s" />
      
      <EuiText>
        <h5>1. Simple Query Parameters (Current Implementation)</h5>
        <p>
          <strong>URL example:</strong> <EuiCode>/workflows/123?tab=executions&executionId=exec-456</EuiCode>
        </p>
        <p>
          <strong>Best for:</strong> Simple state (strings, numbers, booleans)
        </p>
        <p>
          <strong>Pros:</strong> Easy to read, debug, and share
        </p>
        <p>
          <strong>Cons:</strong> Not suitable for complex objects
        </p>
      </EuiText>
      
      <EuiSpacer size="m" />
      
      <EuiText>
        <h5>2. Kibana URL State Storage (Advanced)</h5>
        <p>
          <strong>URL example:</strong> <EuiCode>/workflows/123?_w=(tab:executions,executionId:exec-456)</EuiCode>
        </p>
        <p>
          <strong>Best for:</strong> Complex state (objects, arrays, filters)
        </p>
        <p>
          <strong>Pros:</strong> Rison encoding, state hashing, Kibana integration
        </p>
        <p>
          <strong>Cons:</strong> More complex setup
        </p>
      </EuiText>
      
      <EuiSpacer size="m" />
      
      <EuiCallOut title="Migration Path" color="primary">
        <p>
          Start with the simple query parameters approach. If you later need to store complex filters, 
          execution history, or other rich state, upgrade to the advanced Kibana URL state storage.
        </p>
      </EuiCallOut>
    </EuiPanel>
  );
}; 
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import {
  useCurrentAppId,
  useNavigateToApp,
} from '../shared/chrome_hooks';

const rootStyles = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  padding: 16px;
  gap: 12px;
`;

const titleStyles = css`
  font-weight: 600;
  font-size: 14px;
`;

const hintStyles = css`
  font-size: 12px;
  opacity: 0.8;
`;

const buttonRowStyles = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const DISCOVER_APP_ID = 'discover';
const DASHBOARDS_APP_ID = 'dashboards';

/**
 * POC placeholder for the agent workspace chrome slot (Checkpoint 2).
 * Bootstraps Discover in the application workspace and provides orchestration buttons.
 */
export function AgentSlotPlaceholder() {
  const navigateToApp = useNavigateToApp();
  const currentAppId = useCurrentAppId();
  const hasBootstrappedRef = useRef(false);

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;
    navigateToApp(DISCOVER_APP_ID);
  }, [navigateToApp]);

  return (
    <div css={rootStyles} data-test-subj="agentSlotPlaceholder">
      <div css={titleStyles}>Agent workspace (POC)</div>
      <div css={hintStyles}>
        Peer app workspace column — orchestration actions open apps in the application workspace
        beside this column.
      </div>
      <div css={hintStyles}>
        Application workspace: <strong>{currentAppId ?? 'none'}</strong>
      </div>
      <EuiSpacer size="s" />
      <div css={buttonRowStyles}>
        <EuiButton
          size="s"
          onClick={() => navigateToApp(DISCOVER_APP_ID)}
          data-test-subj="agentSlotOpenDiscover"
        >
          Open Discover
        </EuiButton>
        <EuiButton
          size="s"
          onClick={() => navigateToApp(DASHBOARDS_APP_ID)}
          data-test-subj="agentSlotOpenDashboards"
        >
          Open Dashboard
        </EuiButton>
      </div>
    </div>
  );
}

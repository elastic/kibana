/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';

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

/**
 * POC placeholder for the agent workspace chrome slot (Checkpoint 1).
 */
export function AgentSlotPlaceholder() {
  return (
    <div css={rootStyles} data-test-subj="agentSlotPlaceholder">
      <div css={titleStyles}>Agent workspace (POC)</div>
      <div css={hintStyles}>
        Peer app workspace column — mirrors the application workspace beside it.
      </div>
      <div css={hintStyles}>
        Requires Chrome Next and <code>feature_flags.overrides.core.chrome.agentFirst: true</code> in{' '}
        <code>kibana.dev.yml</code>.
      </div>
    </div>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { layoutVar } from '@kbn/ui-chrome-layout-constants';
import React, { useSyncExternalStore } from 'react';
import {
  getApplicationAttachmentHarness,
  subscribeApplicationAttachmentHarness,
} from './application_attachment_harness_registry';

/**
 * Renders the plugin-registered application attachment harness in the application column.
 */
export function ApplicationAttachmentHarnessShell() {
  const Harness = useSyncExternalStore(
    subscribeApplicationAttachmentHarness,
    getApplicationAttachmentHarness,
    getApplicationAttachmentHarness
  );

  if (!Harness) {
    return null;
  }

  return (
    <div
      css={css`
        position: fixed;
        z-index: 1000;
        top: calc(${layoutVar('application.marginTop')} + 8px);
        left: calc(${layoutVar('application.left')} + 8px);
        pointer-events: auto;
      `}
      data-test-subj="agentBuilderApplicationAttachmentHarness"
    >
      <Harness />
    </div>
  );
}

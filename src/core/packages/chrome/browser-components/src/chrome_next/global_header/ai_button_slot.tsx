/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { HeaderExtension } from '../../shared/header_extension';
import { useAiButtons } from './use_ai_button';

/**
 * Renders the AI button(s) registered via `chrome.next.aiButton.register`.
 *
 * Stop-gap for the Chrome-Next transition: ideally there is a single chrome-owned AI
 * button, but the legacy header lets each solution register its own and manage its own
 * visibility. Until that consolidates we render every registration as-is and let each
 * owner decide whether it shows anything. Once the single-button model lands this should
 * render at most one button.
 *
 * Tech debt: https://github.com/elastic/kibana/issues/272279
 */
export const AiButtonSlot = React.memo(() => {
  const buttons = useAiButtons();

  if (buttons.length === 0) {
    return null;
  }

  return (
    <>
      {buttons.map((button, index) => (
        <HeaderExtension key={index} extension={button.content} />
      ))}
    </>
  );
});

AiButtonSlot.displayName = 'AiButtonSlot';

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButtonIcon } from '@elastic/eui';

interface CopyActionButtonProps {
  copyText: string;
  ariaLabel: string;
}

export const CopyActionButton: React.FC<CopyActionButtonProps> = ({ copyText, ariaLabel }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
  };

  return (
    <EuiButtonIcon
      aria-label={ariaLabel}
      color="text"
      iconType="copyClipboard"
      onClick={handleCopy}
    />
  );
};

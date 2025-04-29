/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';

interface NavIconButtonProps {
  iconType: string;
  onClick: () => void;
  ariaLabel: string;
  dataTestSubj: string;
  toolTipContent: string;
}

export const NavIconButton = ({
  iconType,
  onClick,
  ariaLabel,
  dataTestSubj,
  toolTipContent,
}: NavIconButtonProps) => {
  return (
    <EuiToolTip position="top" content={toolTipContent}>
      <EuiButtonIcon
        iconType={iconType}
        onClick={onClick}
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  );
};

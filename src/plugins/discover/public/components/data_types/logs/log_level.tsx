/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { LogFlyoutDoc, LogLevelBadge } from '@kbn/discover-utils/src';
import * as constants from '../../../../common/data_types/logs/constants';
import { ChipPopover } from './popover_chip';

interface LogLevelProps {
  level: LogFlyoutDoc['log.level'];
}

export function LogLevel({ level }: LogLevelProps) {
  if (!level) return null;

  return (
    <ChipPopover
      property={constants.LOG_LEVEL_FIELD}
      text={level}
      renderChip={({ handleChipClick, handleChipClickAriaLabel, chipCss }) => (
        <LogLevelBadge
          logLevel={level}
          iconType="arrowDown"
          iconSide="right"
          onClick={handleChipClick}
          onClickAriaLabel={handleChipClickAriaLabel}
          css={[chipCss, { width: '80px', paddingInline: '4px' }]}
        />
      )}
    />
  );
}

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
import { CellActionsPopover } from './cell_actions_popover';

interface LogLevelProps {
  level: LogFlyoutDoc['log.level'];
}

export function LogLevel({ level }: LogLevelProps) {
  if (!level) return null;

  return (
    <CellActionsPopover
      property={constants.LOG_LEVEL_FIELD}
      text={level}
      renderPopoverTrigger={({ popoverTriggerProps }) => (
        <LogLevelBadge
          {...popoverTriggerProps}
          logLevel={level}
          iconType="arrowDown"
          iconSide="right"
        />
      )}
    />
  );
}

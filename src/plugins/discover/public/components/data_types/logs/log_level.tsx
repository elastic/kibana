/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { LogFlyoutDoc } from '@kbn/discover-utils/src';
import * as constants from '../../../../common/data_types/logs/constants';
import { ChipWithPopover } from './popover_chip';

const LEVEL_DICT = {
  error: 'danger',
  warn: 'warning',
  info: 'primary',
  debug: 'accent',
} as const;

interface LogLevelProps {
  level: LogFlyoutDoc['log.level'];
  dataTestSubj?: string;
  renderInFlyout?: boolean;
}

export function LogLevel({ level, dataTestSubj, renderInFlyout = false }: LogLevelProps) {
  const { euiTheme } = useEuiTheme();
  if (!level) return null;
  const levelColor = LEVEL_DICT[level as keyof typeof LEVEL_DICT]
    ? euiTheme.colors[LEVEL_DICT[level as keyof typeof LEVEL_DICT]]
    : null;

  const truncatedLogLevel = level.length > 10 ? level.substring(0, 10) + '...' : level;

  if (renderInFlyout) {
    return (
      <ChipWithPopover
        property={constants.LOG_LEVEL_FIELD}
        text={truncatedLogLevel}
        borderColor={levelColor}
        style={{ width: 'none' }}
        dataTestSubj={dataTestSubj}
        shouldRenderPopover={!renderInFlyout}
      />
    );
  }

  return (
    <ChipWithPopover
      property={constants.LOG_LEVEL_FIELD}
      text={level}
      rightSideIcon="arrowDown"
      borderColor={levelColor}
      style={{ width: '80px', marginTop: '-3px' }}
    />
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { useEuiTheme } from '@elastic/eui';
import { ExecutionStatus } from '@kbn/workflows';
import { resolveNodeChipStyle } from './resolve_node_chip_style';

type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

export interface ExecutionState {
  readonly isRunning: boolean;
  readonly isSuccess: boolean;
  readonly isFailed: boolean;
}

export const resolveExecutionState = (execStatus: ExecutionStatus | undefined): ExecutionState => {
  const isRunning =
    execStatus === ExecutionStatus.RUNNING ||
    execStatus === ExecutionStatus.WAITING ||
    execStatus === ExecutionStatus.WAITING_FOR_INPUT ||
    execStatus === ExecutionStatus.PENDING;
  const isSuccess = execStatus === ExecutionStatus.COMPLETED;
  const isFailed =
    execStatus === ExecutionStatus.FAILED ||
    execStatus === ExecutionStatus.TIMED_OUT ||
    execStatus === ExecutionStatus.CANCELLED;
  return { isRunning, isSuccess, isFailed };
};

export interface NodeColors {
  readonly chipBackground: string;
  readonly chipBorder: string;
  readonly chipIconColor: string | undefined;
  readonly chipUseAiGradient: boolean;
  readonly isBrandChip: boolean;
  readonly stepLabelColor: string;
  readonly panelBorder: string;
  readonly statusSuccessColor: string;
  readonly statusFailColor: string;
  readonly hasStatusIcon: boolean;
}

export const resolveNodeColors = (
  euiTheme: EuiTheme,
  stepType: string,
  isTriggerNode: boolean,
  { isRunning, isSuccess, isFailed }: ExecutionState
): NodeColors => {
  const { colors } = euiTheme;
  const chip = resolveNodeChipStyle(euiTheme, stepType, isTriggerNode, { isSuccess, isFailed });

  const panelBorder = isSuccess
    ? colors.success
    : isFailed
    ? colors.danger
    : colors.borderBasePlain;

  return {
    chipBackground: chip.background,
    chipBorder: chip.border,
    chipIconColor: chip.iconColor,
    chipUseAiGradient: chip.useAiGradient ?? false,
    isBrandChip: chip.isBrand,
    stepLabelColor: colors.textHeading,
    panelBorder,
    statusSuccessColor: colors.success,
    statusFailColor: colors.danger,
    hasStatusIcon: isRunning || isSuccess || isFailed,
  };
};

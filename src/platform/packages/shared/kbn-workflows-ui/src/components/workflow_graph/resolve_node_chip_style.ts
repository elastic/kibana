/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { useEuiTheme } from '@elastic/eui';
import { getBuiltInStepDefinition, StepCategory, TRIGGER_STEP_TYPES } from '@kbn/workflows';

type EuiTheme = ReturnType<typeof useEuiTheme>['euiTheme'];

export interface NodeChipStyle {
  readonly background: string;
  readonly border: string;
  readonly iconColor: string | undefined;
  readonly isBrand: boolean;
}

interface ExecutionState {
  readonly isSuccess: boolean;
  readonly isFailed: boolean;
}

const CODE_STEP_TYPES = new Set(['console', 'http']);

function isTriggerStepType(stepType: string, isTrigger: boolean): boolean {
  return isTrigger || TRIGGER_STEP_TYPES.has(stepType) || stepType.startsWith('trigger_');
}

function isBrandStepType(stepType: string): boolean {
  return stepType.startsWith('elasticsearch') || stepType.startsWith('kibana');
}

function categoryTokens(
  colors: EuiTheme['colors'],
  kind: 'trigger' | 'flow' | 'data' | 'code' | 'ai' | 'external' | 'brand'
): Pick<NodeChipStyle, 'background' | 'border' | 'iconColor'> {
  switch (kind) {
    case 'trigger':
      return {
        background: colors.backgroundBaseAccent,
        border: colors.borderBaseAccent,
        iconColor: colors.textAccent,
      };
    case 'flow':
      return {
        background: colors.backgroundBaseAccentSecondary,
        border: colors.borderBaseAccentSecondary,
        iconColor: colors.textAccentSecondary,
      };
    case 'data':
      return {
        background: colors.backgroundBaseWarning,
        border: colors.borderBaseWarning,
        iconColor: colors.textWarning,
      };
    case 'code':
    case 'ai':
      return {
        background: colors.backgroundBasePrimary,
        border: colors.borderBasePrimary,
        iconColor: colors.textPrimary,
      };
    case 'external':
      return {
        background: colors.backgroundBaseSubdued,
        border: colors.borderBaseSubdued,
        iconColor: colors.textSubdued,
      };
    case 'brand':
      return {
        background: colors.backgroundBaseSubdued,
        border: colors.borderBaseSubdued,
        iconColor: undefined,
      };
  }
}

function resolveChipKind(
  stepType: string,
  isTrigger: boolean
): 'trigger' | 'flow' | 'data' | 'code' | 'ai' | 'external' | 'brand' {
  if (isTriggerStepType(stepType, isTrigger)) {
    return 'trigger';
  }
  if (CODE_STEP_TYPES.has(stepType)) {
    return 'code';
  }
  if (isBrandStepType(stepType)) {
    return 'brand';
  }
  if (stepType === 'inference') {
    return 'ai';
  }

  const builtinCategory = getBuiltInStepDefinition(stepType)?.category;
  switch (builtinCategory) {
    case StepCategory.FlowControl:
      return 'flow';
    case StepCategory.Data:
      return 'data';
    case StepCategory.Ai:
      return 'ai';
    case StepCategory.External:
      return 'external';
    case StepCategory.Elasticsearch:
    case StepCategory.Kibana:
    case StepCategory.KibanaCases:
    case StepCategory.KibanaEntityStore:
    case StepCategory.KibanaSecurity:
      return 'brand';
    default:
      return 'external';
  }
}

/**
 * Category → chip tokens for canvas nodes. Idle brand chips (Elasticsearch /
 * Kibana logos) stay on a neutral tile. On success or failure every chip uses
 * the success / danger color tokens for the tile border and icon, with a
 * tinted success / danger fill.
 */
export function resolveNodeChipStyle(
  euiTheme: EuiTheme,
  stepType: string,
  isTrigger: boolean,
  { isSuccess, isFailed }: ExecutionState
): NodeChipStyle {
  const { colors } = euiTheme;
  const kind = resolveChipKind(stepType, isTrigger);
  const isBrand = kind === 'brand';
  const idle = categoryTokens(colors, kind);

  if (!isSuccess && !isFailed) {
    return { ...idle, isBrand };
  }

  if (isSuccess) {
    return {
      background: colors.backgroundBaseSuccess,
      border: colors.success,
      iconColor: colors.success,
      isBrand,
    };
  }

  return {
    background: colors.backgroundBaseDanger,
    border: colors.danger,
    iconColor: colors.danger,
    isBrand,
  };
}

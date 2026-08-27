/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps, IconType } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Suspense, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import { getMaskableIconUrl } from './get_maskable_icon_url';
import { getStepIconType } from './get_step_icon_type';
import { HardcodedIcons } from './hardcoded_icons';
import type { ResolveRegisteredStepIconDeps } from './resolve_registered_step_icon';
import { resolveRegisteredStepIcon } from './resolve_registered_step_icon';
import { useWorkflowsUiServices } from '../../context';

/** Bare trigger `type` values (e.g. `manual`, `alert`, `scheduled`) mapped to workflow icons. */
const TRIGGER_TYPE_ICONS: Record<string, IconType> = {
  manual: HardcodedIcons.manual,
  alert: HardcodedIcons.alert,
  scheduled: HardcodedIcons.scheduled,
};

/** Display labels for the bare trigger `type` values above, shown in the icon tooltip. */
const TRIGGER_TYPE_LABELS: Record<string, string> = {
  manual: i18n.translate('workflows.stepIcons.triggerType.manual', { defaultMessage: 'Manual' }),
  alert: i18n.translate('workflows.stepIcons.triggerType.alert', { defaultMessage: 'Alert' }),
  scheduled: i18n.translate('workflows.stepIcons.triggerType.scheduled', {
    defaultMessage: 'Scheduled',
  }),
};

const DEFAULT_TRIGGER_ICON: IconType = HardcodedIcons.trigger;

/**
 * A resolved icon plus whether it may be repainted as a single-tint mask. Only the
 * built-in maps qualify — registry icons are arbitrary and may be multi-color.
 * `StepIcon` draws the same line by returning registered icons before its own mask
 * gate, which is what keeps an icon from rendering full-color in the workflow list
 * and flattened here.
 */
interface ResolvedIcon {
  iconType: IconType;
  tintable: boolean;
}

function resolveTriggerIcon(
  triggerType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): ResolvedIcon {
  const hardcodedIcon = TRIGGER_TYPE_ICONS[triggerType];
  if (hardcodedIcon) {
    return { iconType: hardcodedIcon, tintable: true };
  }

  const registeredIcon = workflowsExtensions.getTriggerDefinition(triggerType)?.icon;
  if (registeredIcon) {
    return { iconType: registeredIcon, tintable: false };
  }

  return { iconType: DEFAULT_TRIGGER_ICON, tintable: true };
}

function resolveStepIcon(stepType: string, deps: ResolveRegisteredStepIconDeps): ResolvedIcon {
  const registeredIcon = resolveRegisteredStepIcon(stepType, deps);
  return registeredIcon
    ? { iconType: registeredIcon, tintable: false }
    : { iconType: getStepIconType(stepType), tintable: true };
}

export interface TypeIconProps extends Omit<EuiIconProps, 'type'> {
  /** The catalog `stepTypes[n]` or `triggerTypes[n]` value (e.g. `abuseipdb.checkIp`, `manual`). */
  type: string;
  kind: 'step' | 'trigger';
}

/**
 * Renders an icon for a workflow step or trigger `type` string. Step resolution
 * uses the same {@link resolveRegisteredStepIcon} as the plugin's `StepIcon`:
 * dynamically-registered icons (workflows extensions + connector action-type
 * registry) take precedence over the static connector-spec and hardcoded
 * fallbacks, so connectors like `http` that only exist in the action-type
 * registry still render their real icon. The registries come from
 * {@link useWorkflowsUiServices}, so consumers must be wrapped in a
 * `WorkflowsUiServicesProvider`. The tooltip shows the raw `type`, except for
 * the hardcoded trigger types above, which get a capitalized display label.
 */
/*
 * EuiToolTip's default anchor is an inline-block with a normal line box, which
 * verticals the masked-span glyphs and `<svg>` icons differently (baseline vs
 * middle) and makes mixed icon rows look misaligned. Anchor to a zero-line-box
 * flex span instead — same idiom as the plugin's `withTooltip`.
 */
const tooltipAnchorStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 0,
});

export const TypeIcon = React.memo<TypeIconProps>(({ type, kind, title, ...rest }) => {
  const { euiTheme } = useEuiTheme();
  const { workflowsExtensions, triggersActionsUi } = useWorkflowsUiServices();

  const { iconType, tintable } = useMemo(
    () =>
      kind === 'trigger'
        ? resolveTriggerIcon(type, workflowsExtensions)
        : resolveStepIcon(type, {
            workflowsExtensions,
            actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
          }),
    [kind, type, workflowsExtensions, triggersActionsUi]
  );

  const label = title ?? (kind === 'trigger' ? TRIGGER_TYPE_LABELS[type] ?? type : type);
  const maskUrl = tintable ? getMaskableIconUrl(iconType) : undefined;

  const icon = maskUrl ? (
    <span
      css={css`
        display: inline-block;
        width: 16px;
        height: 16px;
        mask-image: url('${maskUrl}');
        mask-size: contain;
        mask-repeat: no-repeat;
        mask-position: center;
        background-color: ${euiTheme.colors.textParagraph};
      `}
      aria-hidden={true}
      data-test-subj="workflowTypeIconDataUrl"
    />
  ) : typeof iconType === 'string' ? (
    <EuiIcon type={iconType} size="m" {...rest} />
  ) : (
    <Suspense fallback={<EuiLoadingSpinner size="s" />}>
      <EuiIcon type={iconType} size="m" {...rest} />
    </Suspense>
  );

  return (
    <EuiToolTip content={label} anchorProps={{ css: css({ display: 'inline-flex' }) }}>
      <span css={tooltipAnchorStyle} tabIndex={0}>
        {icon}
      </span>
    </EuiToolTip>
  );
});
TypeIcon.displayName = 'TypeIcon';

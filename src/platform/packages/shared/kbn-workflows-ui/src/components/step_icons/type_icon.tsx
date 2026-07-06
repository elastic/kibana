/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps, IconType } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import React, { Suspense, useMemo } from 'react';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import { getBaseConnectorType } from './get_base_connector_type';
import { getStepIconType } from './get_step_icon_type';
import { resolveRegisteredStepIcon } from './resolve_registered_step_icon';
import { useWorkflowsUiServices } from '../../context';

/** Bare trigger `type` values (e.g. `manual`, `alert`, `scheduled`) mapped to an EUI icon. */
const TRIGGER_TYPE_ICONS: Record<string, IconType> = {
  manual: 'play',
  alert: 'warning',
  scheduled: 'clock',
};

const DEFAULT_TRIGGER_ICON: IconType = 'bolt';

function resolveTriggerIconType(
  triggerType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): IconType {
  return (
    TRIGGER_TYPE_ICONS[triggerType] ??
    workflowsExtensions.getTriggerDefinition(triggerType)?.icon ??
    DEFAULT_TRIGGER_ICON
  );
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
 * `WorkflowsUiServicesProvider`. The tooltip shows the raw `type`.
 */
export const TypeIcon = React.memo<TypeIconProps>(({ type, kind, title, ...rest }) => {
  const { workflowsExtensions, triggersActionsUi } = useWorkflowsUiServices();

  const iconType = useMemo(
    () =>
      kind === 'trigger'
        ? resolveTriggerIconType(type, workflowsExtensions)
        : resolveRegisteredStepIcon(type, {
            workflowsExtensions,
            actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
          }) ?? getStepIconType(getBaseConnectorType(type)),
    [kind, type, workflowsExtensions, triggersActionsUi]
  );

  const label = title ?? type;

  const icon =
    typeof iconType === 'string' ? (
      <EuiIcon type={iconType} size="m" {...rest} />
    ) : (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <EuiIcon type={iconType} size="m" {...rest} />
      </Suspense>
    );

  return <EuiToolTip content={label}>{icon}</EuiToolTip>;
});
TypeIcon.displayName = 'TypeIcon';

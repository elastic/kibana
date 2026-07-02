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
import { getBaseConnectorType } from './get_base_connector_type';
import { getConnectorSpecIcon } from './get_connector_spec_icon';
import { getStepIconType } from './get_step_icon_type';

/** Bare trigger `type` values (e.g. `manual`, `alert`, `scheduled`) mapped to an EUI icon. */
const TRIGGER_TYPE_ICONS: Record<string, IconType> = {
  manual: 'play',
  alert: 'warning',
  scheduled: 'clock',
};

const DEFAULT_TRIGGER_ICON: IconType = 'bolt';

function resolveTriggerIconType(triggerType: string): IconType {
  return TRIGGER_TYPE_ICONS[triggerType] ?? DEFAULT_TRIGGER_ICON;
}

function resolveStepIconType(stepType: string): IconType {
  return getConnectorSpecIcon(stepType) ?? getStepIconType(getBaseConnectorType(stepType));
}

export interface TypeIconProps extends Omit<EuiIconProps, 'type'> {
  /** The catalog `stepTypes[n]` or `triggerTypes[n]` value (e.g. `abuseipdb.checkIp`, `manual`). */
  type: string;
  kind: 'step' | 'trigger';
}

/**
 * Renders an icon for a workflow step or trigger `type` string using only static,
 * build-time data (connector spec icons + a hardcoded EUI icon map) — no Kibana
 * plugin services required. Used by the Workflow Template Library catalog, which
 * only has `stepTypes` / `triggerTypes` string arrays to work with, not a live
 * connector/action-type registry.
 */
export const TypeIcon = React.memo<TypeIconProps>(({ type, kind, title, ...rest }) => {
  const iconType = useMemo(
    () => (kind === 'trigger' ? resolveTriggerIconType(type) : resolveStepIconType(type)),
    [kind, type]
  );
  // Tooltip shows the raw step / trigger `type` string (e.g. `abuseipdb.checkIp`).
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

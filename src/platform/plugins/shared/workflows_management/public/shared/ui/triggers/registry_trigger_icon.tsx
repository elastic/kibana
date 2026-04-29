/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { capitalize } from 'lodash';
import React, { Suspense } from 'react';
import { isTriggerType } from '@kbn/workflows';
import { triggerSchemas } from '../../../trigger_schemas';

const TRIGGERS_ICONS: Record<string, string> = {
  alert: 'warning',
  manual: 'play',
  scheduled: 'clock',
};

const DEFAULT_TRIGGER_ICON = 'bolt';

/**
 * Resolves the icon for a workflow trigger id: built-in types, then
 * `workflows_extensions` registry (`PublicTriggerDefinition.icon`), else bolt.
 */
export function getTriggerRegistryIconType(triggerId: string): string | React.ComponentType {
  if (isTriggerType(triggerId) && TRIGGERS_ICONS[triggerId]) {
    return TRIGGERS_ICONS[triggerId];
  }
  const definition = triggerSchemas.getTriggerDefinition(triggerId);
  if (definition?.icon) {
    return definition.icon;
  }
  return DEFAULT_TRIGGER_ICON;
}

export function getTriggerRegistryLabel(triggerType: string): string {
  const definition = triggerSchemas.getTriggerDefinition(triggerType);
  return definition?.title ?? capitalize(triggerType);
}

export interface RegistryTriggerIconProps {
  triggerType: string;
  size?: EuiIconProps['size'];
  color?: EuiIconProps['color'];
  title?: string;
  'aria-hidden'?: boolean;
}

export const RegistryTriggerIcon = React.memo(
  ({
    triggerType,
    size = 'l',
    color,
    title,
    'aria-hidden': ariaHidden,
  }: RegistryTriggerIconProps) => {
    const icon = getTriggerRegistryIconType(triggerType);
    const resolvedTitle = title ?? getTriggerRegistryLabel(triggerType);
    if (typeof icon === 'string') {
      return (
        <EuiIcon
          type={icon}
          size={size}
          color={color}
          title={resolvedTitle}
          aria-hidden={ariaHidden}
        />
      );
    }
    const IconComponent = icon;
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <EuiIcon
          type={IconComponent}
          size={size}
          color={color}
          title={resolvedTitle}
          aria-hidden={ariaHidden}
        />
      </Suspense>
    );
  }
);

RegistryTriggerIcon.displayName = 'RegistryTriggerIcon';

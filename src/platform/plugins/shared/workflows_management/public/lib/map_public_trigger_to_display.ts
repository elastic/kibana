/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';

export const DEFAULT_PUBLIC_TRIGGER_ICON: IconType = 'bolt';

export interface PublicTriggerDisplay {
  id: string;
  label: string;
  /** Short subtitle for menus; avoids repeating the label when description is missing. */
  description: string;
  /** Longer text for autocomplete documentation and tooltips. */
  documentation: string;
  icon: IconType;
}

export function mapPublicTriggerToDisplay(
  trigger: Pick<PublicTriggerDefinition, 'id' | 'title' | 'description' | 'icon'>
): PublicTriggerDisplay {
  const label = trigger.title ?? trigger.id;

  return {
    id: trigger.id,
    label,
    description: trigger.description ?? trigger.id,
    documentation: trigger.description ?? trigger.title ?? trigger.id,
    icon: trigger.icon ?? DEFAULT_PUBLIC_TRIGGER_ICON,
  };
}

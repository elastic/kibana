/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getBuiltInTriggerDefinition } from '../spec/builtin_trigger_definitions';

function getLocalizedBuiltInTriggerName(triggerType: string): string | undefined {
  switch (triggerType) {
    case 'manual':
      return i18n.translate('workflows.getTriggerName.manualLabel', {
        defaultMessage: 'Manual',
      });
    case 'alert':
      return i18n.translate('workflows.getTriggerName.alertLabel', {
        defaultMessage: 'Alert',
      });
    case 'scheduled':
      return i18n.translate('workflows.getTriggerName.scheduledLabel', {
        defaultMessage: 'Scheduled',
      });
    default:
      return undefined;
  }
}

/**
 * Display name for a trigger type: the registered title, then the localized
 * built-in label, then the type id.
 */
export function getTriggerName(triggerType: string, registeredTitle?: string): string {
  const title = registeredTitle?.trim();
  if (title) {
    return title;
  }
  return (
    getLocalizedBuiltInTriggerName(triggerType) ??
    getBuiltInTriggerDefinition(triggerType)?.label ??
    triggerType
  );
}

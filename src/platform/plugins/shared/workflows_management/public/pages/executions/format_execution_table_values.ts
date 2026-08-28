/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  isWellKnownWorkflowTriggerSource,
  type WellKnownWorkflowTriggerSource,
} from '@kbn/workflows';
import { getTriggerLabel } from '../../widgets/worflows_triggers_list/worflows_triggers_list';

const WELL_KNOWN_TRIGGER_LABELS: Record<WellKnownWorkflowTriggerSource, string> = {
  manual: i18n.translate('workflowsManagement.executionsPage.trigger.manual', {
    defaultMessage: 'Manual',
  }),
  scheduled: i18n.translate('workflowsManagement.executionsPage.trigger.schedule', {
    defaultMessage: 'Schedule',
  }),
  alert: i18n.translate('workflowsManagement.executionsPage.trigger.alert', {
    defaultMessage: 'Alert',
  }),
  'workflow-step': i18n.translate('workflowsManagement.executionsPage.trigger.workflowStep', {
    defaultMessage: 'Workflow step',
  }),
};

export const formatExecutionTriggerLabel = (
  triggeredBy: string | undefined
): string | undefined => {
  if (!triggeredBy) {
    return undefined;
  }

  if (isWellKnownWorkflowTriggerSource(triggeredBy)) {
    return WELL_KNOWN_TRIGGER_LABELS[triggeredBy];
  }

  return getTriggerLabel(triggeredBy);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { getHitlChannelConnectorTypeFromPath, isHitlWaitStepType } from '@kbn/workflows';
import { getConnectorTypeIdForTriggerEventId } from '../../../../../../../common/triggers/connector_event_triggers';
import type { StepInfo, StepPropInfo } from '../../../../../../entities/workflows/store';
import {
  getTriggerConnectorIdBlockIndex,
  getTriggerTypeAtIndex,
} from '../../context/triggers_utils';

/**
 * Resolves which connector type to use when suggesting connector-id values.
 * Step-level connector-id uses the step type (e.g. `slack`); nested ids under
 * `waitForInput` / `waitForApproval` `with.channels` map to the notification
 * channel connector type. HITL wait step types are never action types.
 */
export function resolveConnectorIdStepType(
  focusedStepInfo: StepInfo | null,
  path: ReadonlyArray<string | number>,
  focusedYamlPair: StepPropInfo | null
): string | null {
  if (!focusedStepInfo?.stepType) {
    return null;
  }

  if (isHitlWaitStepType(focusedStepInfo.stepType)) {
    return (
      getHitlChannelConnectorTypeFromPath(focusedYamlPair?.path) ??
      getHitlChannelConnectorTypeFromPath(path)
    );
  }

  return focusedStepInfo.stepType;
}

/**
 * Resolves the connector type for a trigger-level `connector-id`
 * (`triggers[i].type` → spec `metadata.id`).
 */
export function resolveConnectorIdTriggerType(
  path: ReadonlyArray<string | number> | undefined,
  yamlDocument: Document | undefined
): string | null {
  if (!path || !yamlDocument) {
    return null;
  }
  const triggerIndex = getTriggerConnectorIdBlockIndex([...path]);
  if (triggerIndex === null) {
    return null;
  }
  const triggerType = getTriggerTypeAtIndex(yamlDocument, triggerIndex);
  if (!triggerType) {
    return null;
  }
  return getConnectorTypeIdForTriggerEventId(triggerType) ?? null;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
import type { ESQLControlState, PublishesESQLVariables } from '@kbn/esql-types';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { omit } from 'lodash';

export const addControlsFromSavedSession = async (
  container: CanAddNewPanel & Partial<PublishesESQLVariables>,
  controlGroupJson: string,
  uuid?: string | undefined
): Promise<void> => {
  const controlsState = controlGroupJson.length
    ? (JSON.parse(controlGroupJson) as ControlPanelsState<ESQLControlState>)
    : {};
  const esqlVariables$ = container.esqlVariables$;
  const esqlVariables = esqlVariables$?.getValue();

  // Only add controls whose variableName does not exist in current esqlVariables
  for (const panel of Object.values(controlsState)) {
    const variableName = panel.variableName;
    const variableExists = esqlVariables?.some((esqlVar) => esqlVar.key === variableName);
    if (!variableExists) {
      await container.addNewPanel(
        {
          panelType: ESQL_CONTROL,
          serializedState: {
            ...omit(panel, ['width', 'grow', 'order']),
          },
        },
        { beside: uuid, scrollToPanel: false }
      );
    }
  }
};

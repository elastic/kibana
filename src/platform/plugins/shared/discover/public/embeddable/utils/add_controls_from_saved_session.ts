/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { PublishesESQLVariables } from '@kbn/esql-types';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { getAllEsqlControls } from '@kbn/esql-controls-utils';
import { omit } from 'lodash';
import { parseControlGroupJson } from '../../application/main/state_management/redux/utils';

export const addControlsFromSavedSession = async (
  container: CanAddNewPanel & Partial<PublishesESQLVariables>,
  controlGroupJson: string,
  uuid?: string | undefined
): Promise<void> => {
  const controlsState = parseControlGroupJson(controlGroupJson);
  const existingVariableNames = new Set(
    (container.esqlVariables$?.getValue() ?? []).map(({ key }) => key)
  );
  // Published variables can lag behind the controls (e.g. with auto-apply off), so also check the
  // controls themselves
  if (apiIsPresentationContainer(container)) {
    for (const { variable_name: variableName } of Object.values(getAllEsqlControls(container))) {
      existingVariableNames.add(variableName);
    }
  }

  // Only add controls whose variableName does not exist on the container yet
  for (const panel of Object.values(controlsState)) {
    if (!existingVariableNames.has(panel.variable_name)) {
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

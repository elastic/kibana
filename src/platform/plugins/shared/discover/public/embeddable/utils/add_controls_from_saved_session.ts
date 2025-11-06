/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { CanAddNewPanel } from '@kbn/presentation-containers';
import type { SavedObjectCommon, FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { type ESQLControlState, apiPublishesESQLVariables } from '@kbn/esql-types';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { StickyControlState } from '@kbn/controls-schemas';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { asyncForEach } from '@kbn/std';
import { omit } from 'lodash';

export const addControlsFromSavedSession = async (
  container: CanAddNewPanel & { esqlVariables$?: unknown },
  savedObject: SavedObjectCommon<FinderAttributes>
): Promise<void> => {
  const savedSessionAttributes = savedObject.attributes as SavedSearchAttributes;
  if (
    !savedSessionAttributes.controlGroupJson ||
    Object.keys(savedSessionAttributes.controlGroupJson).length === 0 ||
    !apiPublishesESQLVariables(container)
  ) {
    return;
  }

  const controlsState = JSON.parse(savedSessionAttributes.controlGroupJson) as ControlPanelsState<
    StickyControlState & ESQLControlState
  >;
  const esqlVariables$ = container.esqlVariables$;
  const esqlVariables = esqlVariables$?.getValue();

  // Only add controls whose variableName does not exist in current esqlVariables
  await asyncForEach(Object.values(controlsState), async (panel): Promise<void> => {
    const variableName = panel.variableName;
    const variableExists = esqlVariables?.some((esqlVar) => esqlVar.key === variableName);
    if (!variableExists) {
      await container.addNewPanel({
        panelType: ESQL_CONTROL,
        serializedState: {
          rawState: {
            ...omit(panel, ['width', 'grow', 'order']),
          },
        },
      });
    }
  });
};

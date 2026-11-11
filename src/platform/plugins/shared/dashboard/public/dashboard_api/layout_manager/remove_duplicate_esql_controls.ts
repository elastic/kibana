/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { getESQLControlVariablesFromState } from '@kbn/esql-utils';
import type { DashboardChildState, DashboardLayout } from './types';

/** Drops incoming ES|QL controls whose variable already has a control on the dashboard or earlier in the batch, unless the package updates an existing panel ID. */
export const removeDuplicateEsqlControls = (
  embeddables: EmbeddablePackageState[],
  layout: DashboardLayout,
  childState: DashboardChildState
): EmbeddablePackageState[] => {
  const existingPanelIds = new Set([
    ...Object.keys(layout.panels),
    ...Object.keys(layout.pinnedPanels),
  ]);
  const usedVariableNames = new Set(
    getESQLControlVariablesFromState([...existingPanelIds].map((id) => childState[id])).map(
      ({ key }) => key
    )
  );

  return embeddables.filter(({ embeddableId, serializedState }) => {
    const [variable] = getESQLControlVariablesFromState([serializedState]);
    if (!variable) return true;
    // Packages that target an existing panel update it in place.
    if (embeddableId && existingPanelIds.has(embeddableId)) {
      usedVariableNames.add(variable.key);
      return true;
    }
    if (usedVariableNames.has(variable.key)) return false;
    usedVariableNames.add(variable.key);
    return true;
  });
};

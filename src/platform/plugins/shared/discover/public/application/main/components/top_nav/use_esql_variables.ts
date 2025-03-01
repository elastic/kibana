/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { ESQLControlState } from '@kbn/esql/public';
import { type ControlGroupRendererApi } from '@kbn/controls-plugin/public';

// temporary here
interface ControlGroup {
  type: string;
  serializeState: () => { rawState: ESQLControlState; id: string };
}

export const useESQLVariables = ({
  controlGroupAPI,
  onTextLangQueryChange,
}: {
  onTextLangQueryChange: (query: string) => void;
  controlGroupAPI?: ControlGroupRendererApi;
}) => {
  const controlsPanels = useStateFromPublishingSubject(
    controlGroupAPI?.children$
  ) as unknown as ControlGroup[];
  const dashboardESQLControls = useMemo(() => {
    const esqlControls = Object.values(controlsPanels || {}).filter(
      (panel) => panel.type === 'esqlControl'
    );
    const esqlControlsState = esqlControls.map((control) => {
      const serializedState = control.serializeState();
      return {
        ...serializedState.rawState,
        id: serializedState.id,
      };
    });
    return esqlControlsState;
  }, [controlsPanels]);
  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      if (updatedQuery) {
        // add a new control
        controlGroupAPI?.addNewPanel({
          panelType: 'esqlControl',
          initialState: {
            ...controlState,
            id: uuidv4(),
          },
        });
        onTextLangQueryChange(updatedQuery);
      } else {
        const associatedControl = dashboardESQLControls.find(
          (control) =>
            control.variableName === controlState.variableName &&
            control.variableType === controlState.variableType
        );

        if (associatedControl) {
          // update existing control
          controlGroupAPI?.replacePanel(associatedControl.id, {
            panelType: 'esqlControl',
            initialState: controlState,
          });
        }
      }
    },
    [controlGroupAPI, dashboardESQLControls, onTextLangQueryChange]
  );

  const onCancelControl = useCallback(() => {}, []);

  return { onSaveControl, onCancelControl, dashboardESQLControls };
};

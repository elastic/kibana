/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type ControlGroupRendererApi } from '@kbn/controls-plugin/public';

export const useESQLVariables = ({
  controlGroupAPI,
  onTextLangQueryChange,
}: {
  onTextLangQueryChange: (query: string) => void;
  controlGroupAPI?: ControlGroupRendererApi;
}) => {
  const onSaveControl = useCallback(
    async (controlState: Record<string, unknown>, updatedQuery: string) => {
      // add a new control
      controlGroupAPI?.addNewPanel({
        panelType: 'esqlControl',
        initialState: {
          ...controlState,
          id: uuidv4(),
        },
      });

      // update the query
      if (updatedQuery) {
        onTextLangQueryChange(updatedQuery);
      }
    },
    [controlGroupAPI, onTextLangQueryChange]
  );

  const onCancelControl = useCallback(() => {}, []);

  return { onSaveControl, onCancelControl };
};

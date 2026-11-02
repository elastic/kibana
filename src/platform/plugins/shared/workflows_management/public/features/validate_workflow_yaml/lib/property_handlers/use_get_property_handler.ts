/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { getPropertyHandler } from '../../../../../common/schema';
import { useWorkflowsContext } from '../../../../common/context/workflows_context';
import type { GetStepPropertyHandler } from '../../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/step_property/get_step_property_suggestions';

export const useGetPropertyHandler = (): GetStepPropertyHandler => {
  const { internalStepsEditorHandlers } = useWorkflowsContext();

  return useCallback<GetStepPropertyHandler>(
    (stepType, scope, key) => {
      const internalEditorHandlers = internalStepsEditorHandlers.getEditorHandlers(stepType);
      if (internalEditorHandlers) {
        const scopeHandlers = internalEditorHandlers?.[scope];
        const handler = scopeHandlers?.[key as keyof typeof scopeHandlers];
        if (handler) {
          return handler;
        }
      }
      // Fall back to contract getPropertyHandler
      return getPropertyHandler(stepType, scope, key);
    },
    [internalStepsEditorHandlers]
  );
};

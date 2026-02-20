/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState, useRef } from 'react';
import type { BehaviorSubject } from 'rxjs';

import type { ControlGroupRendererProps } from './control_group_renderer';
import { controlGroupStateBuilder } from './control_group_state_builder';
import type {
  ControlGroupCreationOptions,
  ControlGroupRuntimeState,
  ControlPanelsState,
} from './types';

export const useInitialControlGroupState = (
  getCreationOptions: ControlGroupRendererProps['getCreationOptions'],
  lastSavedState$Ref: React.MutableRefObject<BehaviorSubject<ControlPanelsState>>
): {
  initialState: ControlGroupCreationOptions['initialState'];
  getEditorConfig: React.MutableRefObject<ControlGroupCreationOptions['getEditorConfig']>;
} => {
  const [initialState, setInitialState] = useState<
    ControlGroupCreationOptions['initialState'] | undefined
  >();
  const getEditorConfig = useRef<ControlGroupCreationOptions['getEditorConfig']>();

  useEffect(() => {
    let cancelled = false;
    const emptyState: ControlGroupRuntimeState = { initialChildControlState: {} };
    getCreationOptions(emptyState, controlGroupStateBuilder).then((creationOptions) => {
      if (cancelled) return;
      getEditorConfig.current = creationOptions.getEditorConfig;
      const ignoreParentSettings = creationOptions.initialState?.ignoreParentSettings;
      const controls = Object.entries(
        creationOptions?.initialState?.initialChildControlState ?? {}
      ).reduce((prev, [id, control]) => {
        const controlState = {
          // pass in legacy ignore parent settings into respective panel level settings, if necessary
          use_global_filters: !(
            ignoreParentSettings?.ignoreFilters || ignoreParentSettings?.ignoreQuery
          ),
          ignore_validations: ignoreParentSettings?.ignoreValidations,
          ...control,
        };
        return {
          ...prev,
          [id]: controlState,
        };
      }, {} as ControlPanelsState);

      lastSavedState$Ref.current.next(controls);
      setInitialState({
        ...creationOptions.initialState,
        initialChildControlState: controls,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { initialState, getEditorConfig };
};

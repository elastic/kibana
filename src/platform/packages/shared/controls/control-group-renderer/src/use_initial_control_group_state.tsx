/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';

import type { ControlGroupRendererProps } from './control_group_renderer';
import { controlGroupStateBuilder } from './control_group_state_builder';
import type { ControlGroupCreationOptions, ControlPanelsState } from './types';

export const useInitialControlGroupState = (
  getCreationOptions: ControlGroupRendererProps['getCreationOptions'],
  lastSavedState$Ref: React.MutableRefObject<BehaviorSubject<ControlPanelsState>>
) => {
  const [initialState, setInitialState] = useState<ControlGroupCreationOptions | undefined>();

  useEffect(() => {
    let cancelled = false;
    getCreationOptions(controlGroupStateBuilder).then((creationOptions) => {
      if (cancelled) return;
      const ignoreParentSettings = creationOptions.initialState?.ignoreParentSettings;
      const controls = Object.entries(
        creationOptions?.initialState?.initialChildControlState ?? {}
      ).reduce((prev, [id, control]) => {
        const controlState = {
          // pass in legacy ignore parent settings into respective panel level settings, if necessary
          useGlobalFilters: !(
            ignoreParentSettings?.ignoreFilters || ignoreParentSettings?.ignoreQuery
          ),
          ignoreValidations: ignoreParentSettings?.ignoreValidations,
          ...control,
        };
        return {
          ...prev,
          [id]: controlState,
        };
      }, {} as ControlPanelsState);

      lastSavedState$Ref.current.next(controls);
      setInitialState({
        ...creationOptions,
        initialState: { ...creationOptions.initialState, initialChildControlState: controls },
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return initialState;
};

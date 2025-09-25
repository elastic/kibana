/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BehaviorSubject } from 'rxjs';

import type { ControlGroupRendererProps } from './control_group_renderer';
import { controlGroupStateBuilder } from './control_group_state_builder';
import type { ControlGroupCreationOptions, ControlGroupRuntimeState } from './types';

export const useInitialControlGroupState = (
  getCreationOptions: ControlGroupRendererProps['getCreationOptions'],
  lastState$Ref: React.MutableRefObject<
    BehaviorSubject<ControlGroupRuntimeState['initialChildControlState']>
  >
) => {
  const [initialState, setInitialState] = useState<ControlGroupCreationOptions | undefined>();

  useEffect(() => {
    let cancelled = false;
    getCreationOptions(controlGroupStateBuilder).then((creationOptions) => {
      if (cancelled) return;
      const ignoreParentSettings = creationOptions.initialState?.ignoreParentSettings;
      const controls = Object.values(
        creationOptions?.initialState?.initialChildControlState ?? {}
      ).reduce((prev, control, index) => {
        const { id = uuidv4(), ...rest } = control;
        return {
          ...prev,
          [id]: {
            ...rest,
            order: rest.order ?? index,
            useGlobalFilters:
              !ignoreParentSettings?.ignoreFilters || !ignoreParentSettings?.ignoreQuery,
            ignoreValidations: ignoreParentSettings?.ignoreValidations,
          },
        };
      }, {} as ControlGroupRuntimeState['initialChildControlState']);

      lastState$Ref.current.next(controls);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { useEffect, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';

import type { SerializedPanelState } from '@kbn/presentation-publishing';

import type { ControlGroupRendererProps } from './control_group_renderer';
import { controlGroupStateBuilder } from './control_group_state_builder';
import type { ControlGroupCreationOptions, ControlGroupRuntimeState } from './types';

export const useInitialControlGroupState = (
  getCreationOptions: ControlGroupRendererProps['getCreationOptions'],
  lastSavedChildState$Ref: React.MutableRefObject<
    BehaviorSubject<{ [id: string]: SerializedPanelState<object> }>
  >
) => {
  const [initialState, setInitialState] = useState<ControlGroupCreationOptions | undefined>();

  useEffect(() => {
    let cancelled = false;
    getCreationOptions(controlGroupStateBuilder).then((creationOptions) => {
      if (cancelled) return;
      const ignoreParentSettings = creationOptions.initialState?.ignoreParentSettings;
      const serializedState: { [id: string]: SerializedPanelState<object> } = {};
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
        serializedState[id] = { rawState: omit(controlState, ['grow', 'width', 'order']) };
        return {
          ...prev,
          [id]: controlState,
        };
      }, {} as ControlGroupRuntimeState['initialChildControlState']);
      console.log({ serializedState });
      lastSavedChildState$Ref.current.next(serializedState);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { useEffect, useMemo } from 'react';
import { BehaviorSubject, map, pairwise } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { StickyControlState } from '@kbn/controls-schemas';
import type { DashboardLayout } from '@kbn/dashboard-plugin/public/dashboard_api/layout_manager';
import type { PanelPackage } from '@kbn/presentation-containers';

import type { ControlGroupCreationOptions, ControlGroupRuntimeState } from './types';
import type { useChildrenApi } from './use_children_api';

export const useLayoutApi = (
  state: ControlGroupCreationOptions | undefined,
  childrenApi: ReturnType<typeof useChildrenApi>
) => {
  const layoutApi = useMemo(() => {
    if (!state) return;

    const layout$ = new BehaviorSubject<DashboardLayout>({
      controls: getControlsLayout(state.initialState?.initialChildControlState),
      panels: {},
      sections: {},
    });

    return {
      layout$,
      addNewPanel: <State extends StickyControlState = StickyControlState>(
        panelPackage: PanelPackage<State>
      ) => {
        const { panelType: type, serializedState, maybePanelId } = panelPackage;
        const uuid = maybePanelId ?? uuidv4();

        if (serializedState) childrenApi.setSerializedStateForChild(uuid, serializedState);
        const oldControls = layout$.getValue().controls;
        const { rawState } = {
          rawState: {
            width: DEFAULT_CONTROL_WIDTH as StickyControlState['width'],
            grow: DEFAULT_CONTROL_GROW as StickyControlState['grow'],
            ...serializedState?.rawState,
          },
        };
        layout$.next({
          panels: {},
          sections: {},
          controls: {
            ...oldControls,
            [uuid]: {
              order: Object.keys(oldControls).length,
              width: rawState.width,
              grow: rawState.grow,
              type: type as StickyControlState['type'],
            },
          },
        });
      },
      layoutHasUnsavedChanges$: layout$.pipe(
        pairwise(),
        map(([before, after]) => ({
          hasUnsavedChanges: !deepEqual(before, after),
        }))
      ),
    };
  }, [state, childrenApi]);

  // useEffect(() => {
  //   if (!layoutApi) return;
  //   lastSavedLayoutState$Ref.current.subscribe((lastSavedState) => {
  //     console.log({ lastSavedState });
  //     layoutApi?.layout$.next({
  //       controls: lastSavedState,
  //       panels: {},
  //       sections: {},
  //     });
  //   });
  // }, [layoutApi, lastSavedLayoutState$Ref]);

  return layoutApi;
};

const getControlsLayout = (
  initialChildControlState: ControlGroupRuntimeState['initialChildControlState'] | undefined
) => {
  return Object.entries(initialChildControlState ?? {}).reduce((prev, [id, control], index) => {
    const { type, width, grow, order } = control;
    return {
      ...prev,
      [id]: {
        order: order ?? index,
        id,
        width,
        grow,
        type,
      },
    };
  }, {});
};

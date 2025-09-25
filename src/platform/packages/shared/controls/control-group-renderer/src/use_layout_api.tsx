/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { pick } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
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
  childrenApi: ReturnType<typeof useChildrenApi>,
  lastSavedState$Ref: React.MutableRefObject<BehaviorSubject<{ [id: string]: StickyControlState }>>
) => {
  const layout$Ref = useRef(
    new BehaviorSubject<DashboardLayout>({ controls: {}, panels: {}, sections: {} })
  );

  useEffect(() => {
    /** Keep `layout$` in sync with `lastSavedState$Ref` */
    const lastSavedStateSubscription = lastSavedState$Ref.current.subscribe((lastSavedState) => {
      const lastSavedLayout: DashboardLayout['controls'] = {};
      Object.entries(lastSavedState).forEach(([id, control]) => {
        lastSavedLayout[id] = pick(control, [
          'grow',
          'width',
          'order',
          'type',
        ]) as DashboardLayout['controls'][string];
      });
      const currentLayout = layout$Ref.current.getValue();
      layout$Ref.current.next({
        ...currentLayout,
        controls: { ...currentLayout.controls, ...lastSavedLayout },
      });
    });

    return () => {
      lastSavedStateSubscription.unsubscribe();
    };
  }, [lastSavedState$Ref]);

  const layoutApi = useMemo(() => {
    if (!state) return;

    layout$Ref.current.next({
      controls: getControlsLayout(state.initialState?.initialChildControlState),
      panels: {},
      sections: {},
    });

    return {
      layout$: layout$Ref.current,
      addNewPanel: <State extends StickyControlState = StickyControlState>(
        panelPackage: PanelPackage<State>
      ) => {
        const { panelType: type, serializedState, maybePanelId } = panelPackage;
        const uuid = maybePanelId ?? uuidv4();

        if (serializedState) childrenApi?.setSerializedStateForChild(uuid, serializedState);
        const oldControls = layout$Ref.current.getValue().controls;
        const { rawState } = {
          rawState: {
            width: DEFAULT_CONTROL_WIDTH as StickyControlState['width'],
            grow: DEFAULT_CONTROL_GROW as StickyControlState['grow'],
            ...serializedState?.rawState,
          },
        };
        layout$Ref.current.next({
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
    };
  }, [state, childrenApi]);

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

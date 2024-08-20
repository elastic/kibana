/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createCellActionFactory } from '@kbn/cell-actions/actions';
import { useEffect, useMemo, useState } from 'react';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import { uniqueId } from 'lodash';
import type { DiscoverCellAction, DiscoverCellActionMetadata } from '../types';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useProfileAccessor } from './use_profile_accessor';

export const DISCOVER_CELL_ACTIONS_TRIGGER: Trigger = { id: 'DISCOVER_CELL_ACTIONS_TRIGGER_ID' };

const DISCOVER_CELL_ACTION_TYPE = 'discover-cellAction-type';

export const useCellActions = () => {
  const { uiActions } = useDiscoverServices();
  const [cellActionsMetadata, setCellActionMetadata] = useState<
    DiscoverCellActionMetadata | undefined
  >();
  const getAdditionalCellActionsAccessor = useProfileAccessor('getAdditionalCellActions');
  const additionalCellActions = useMemo(
    () => getAdditionalCellActionsAccessor(() => [])(),
    [getAdditionalCellActionsAccessor]
  );

  useEffect(() => {
    const instanceId = uniqueId();
    const actions = additionalCellActions.map((action, i) => {
      const factory = createCellActionFactory<DiscoverCellAction>(() => ({
        type: DISCOVER_CELL_ACTION_TYPE,
        getIconType: ({ data }) => action.iconType,
        getDisplayName: ({ data }) => action.displayName,
        getDisplayNameTooltip: ({ data }) => action.displayName,
        isCompatible: async ({ data, metadata }) => {
          if (metadata?.instanceId !== instanceId) {
            return false;
          }
          //   const field = data[0]?.field;
          return action.isCompatible?.() ?? true;
        },
        execute: async ({ data }) => {
          //   const field = data[0]?.field;
          //   const value = data[0]?.value;
          return action.execute();
        },
      }));

      return factory()({ id: uniqueId(), order: i });
    });

    actions.forEach((action) => {
      uiActions.registerAction(action);
      uiActions.attachAction(DISCOVER_CELL_ACTIONS_TRIGGER.id, action.id);
    });

    setCellActionMetadata({ instanceId });

    return () => {
      actions.forEach((action) => {
        uiActions.detachAction(DISCOVER_CELL_ACTIONS_TRIGGER.id, action.id);
        uiActions.unregisterAction(action.id);
      });

      setCellActionMetadata(undefined);
    };
  }, [additionalCellActions, uiActions]);

  return { cellActionsMetadata };
};

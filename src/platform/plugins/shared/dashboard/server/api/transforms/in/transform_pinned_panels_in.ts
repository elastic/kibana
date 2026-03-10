/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { Writable } from 'utility-types';

import type { Reference } from '@kbn/content-management-utils';
import type { LegacyStoredPinnedControlState } from '@kbn/controls-schemas';

import { type DashboardState, prefixReferencesFromPanel } from '../../../../common';
import { embeddableService, logger } from '../../../kibana_services';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object/schema';

type PinnedPanelsState = Required<DashboardState>['pinned_panels'];

export function transformPinnedPanelsIn(pinnedPanels?: PinnedPanelsState): {
  pinnedPanels?: Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];
  references: Reference[];
} {
  if (!pinnedPanels) return { references: [] };

  let references: Reference[] = [];
  const updatedPinnedPanels = Object.fromEntries(
    pinnedPanels.map((controlState, index) => {
      const { uid = uuidv4(), type } = controlState;
      const transforms = embeddableService.getTransforms(type);

      let transformedControlState = { ...controlState } as Partial<
        Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'][number]
      >;
      try {
        if (transforms?.transformIn) {
          const transformed = transforms.transformIn(controlState.config);
          // prefix all the reference names with their IDs so that they are unique
          references = [
            ...references,
            ...prefixReferencesFromPanel(uid, transformed.references ?? []),
          ];
          // update the reference names in the SO so that we can inject the references later
          const transformedState = transformed.state as Writable<LegacyStoredPinnedControlState>;
          if ('dataViewRefName' in transformedState) {
            transformedControlState = {
              ...transformedControlState,
              config: {
                ...transformedState,
                dataViewRefName: `${uid}:${transformedState.dataViewRefName}`,
              },
            };
          }
        } else {
          transformedControlState = {
            ...transformedControlState,
            config: controlState.config,
          };
        }
      } catch (transformInError) {
        // do not prevent save if transformIn throws
        logger.warn(
          `Unable to transform "${type}" embeddable state on save. Error: ${transformInError.message}`
        );
      }

      const { width, grow, config } = transformedControlState;
      return [
        uid,
        {
          order: index,
          type,
          width,
          grow,
          config: { ...omit(config, ['type']) },
        },
      ];
    })
  );

  return {
    pinnedPanels: updatedPinnedPanels,
    references,
  };
}

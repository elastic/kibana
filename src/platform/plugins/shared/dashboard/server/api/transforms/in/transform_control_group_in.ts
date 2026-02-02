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

import type { Reference } from '@kbn/content-management-utils';
import type { ControlsGroupState } from '@kbn/controls-schemas';

import { prefixReferencesFromPanel } from '../../../../common';
import type { StoredControlState } from '../../../dashboard_saved_object';
import { embeddableService, logger } from '../../../kibana_services';

export function transformControlGroupIn(controls?: ControlsGroupState) {
  if (!controls) return { references: [] };

  let references: Reference[] = [];
  const updatedControls = Object.fromEntries(
    controls.map((controlState, index) => {
      const { uid = uuidv4(), type } = controlState;
      const transforms = embeddableService.getTransforms(type);

      const transformedControlState = { ...controlState } as Partial<StoredControlState>;
      try {
        if (transforms?.transformIn) {
          const transformed = transforms.transformIn(controlState.config);
          // prefix all the reference names with their IDs so that they are unique
          references = [
            ...references,
            ...prefixReferencesFromPanel(uid, transformed.references ?? []),
          ];
          // update the reference names in the SO so that we can inject the references later
          const transformedState = transformed.state as StoredControlState['explicitInput'];
          transformedControlState.explicitInput = transformedState;
          transformedControlState.explicitInput.dataViewRefName = `${uid}:${transformedState.dataViewRefName}`;
        } else {
          transformedControlState.explicitInput = controlState.config;
        }
      } catch (transformInError) {
        // do not prevent save if transformIn throws
        logger.warn(
          `Unable to transform "${type}" embeddable state on save. Error: ${transformInError.message}`
        );
      }

      const { width, grow, explicitInput } = transformedControlState;
      return [
        uid,
        {
          order: index,
          type,
          width,
          grow,
          explicitInput: { ...omit(explicitInput, ['type']) },
        },
      ];
    })
  );

  return {
    controlsJSON: JSON.stringify(updatedControls),
    references,
  };
}

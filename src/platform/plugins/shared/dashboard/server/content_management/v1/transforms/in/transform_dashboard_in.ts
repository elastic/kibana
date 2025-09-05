/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardAttributes } from '../../types';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import { transformPanelsIn } from './transform_panels_in';
import { transformControlGroupIn } from './transform_control_group_in';
import { transformSearchSourceIn } from './transform_search_source_in';

export const transformDashboardIn = async ({
  dashboardState,
  replaceTagReferencesByName,
  incomingReferences = [],
}: {
  dashboardState: DashboardAttributes;
  incomingReferences?: SavedObjectReference[];
  replaceTagReferencesByName?: ({
    references,
    newTagNames,
  }: {
    references: SavedObjectReference[];
    newTagNames: string[];
  }) => Promise<SavedObjectReference[]>;
}): Promise<
  | {
      attributes: DashboardSavedObjectAttributes;
      references: SavedObjectReference[];
      error: null;
    }
  | {
      attributes: null;
      references: null;
      error: Error;
    }
> => {
  try {
    const tagReferences =
      replaceTagReferencesByName && dashboardState.tags && dashboardState.tags.length
        ? await replaceTagReferencesByName({
            references: incomingReferences,
            newTagNames: dashboardState.tags,
          })
        : incomingReferences;

    const { controlGroupInput, kibanaSavedObjectMeta, options, panels, tags, ...rest } =
      dashboardState;
    const { panelsJSON, sections, references: panelReferences } = transformPanelsIn(panels);

    const { searchSourceJSON, references: searchSourceReferences } =
      transformSearchSourceIn(kibanaSavedObjectMeta);

    const { controlsJSON, references: controlGroupReferences } =
      transformControlGroupIn(controlGroupInput);

    const attributes = {
      ...rest,
      ...(controlsJSON && {
        controlGroupInput: {
          panelsJSON: controlsJSON,
        },
      }),
      ...(options && {
        optionsJSON: JSON.stringify(options),
      }),
      ...(panels && {
        panelsJSON,
      }),
      ...(sections?.length && { sections }),
      ...(kibanaSavedObjectMeta && {
        kibanaSavedObjectMeta: { searchSourceJSON },
      }),
    };
    return {
      attributes,
      references: [
        ...tagReferences,
        ...panelReferences,
        ...controlGroupReferences,
        ...searchSourceReferences,
      ],
      error: null,
    };
  } catch (e) {
    return { attributes: null, references: null, error: e };
  }
};

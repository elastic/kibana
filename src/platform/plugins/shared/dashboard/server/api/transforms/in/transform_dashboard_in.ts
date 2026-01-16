/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardState } from '../../types';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import { transformPanelsIn } from './transform_panels_in';
import { transformControlGroupIn } from './transform_control_group_in';
import { transformSearchSourceIn } from './transform_search_source_in';
import { transformTagsIn } from './transform_tags_in';
import { transformOptionsIn } from './transform_options_in';

export const transformDashboardIn = (
  dashboardState: DashboardState
):
  | {
      attributes: DashboardSavedObjectAttributes;
      references: SavedObjectReference[];
      error: null;
    }
  | {
      attributes: null;
      references: null;
      error: Error;
    } => {
  try {
    const {
      pinned_panels,
      options,
      filters,
      panels,
      query,
      tags,
      time_range,
      refresh_interval,
      project_routing,
      ...rest
    } = dashboardState;

    const tagReferences = transformTagsIn(tags);

    const {
      panelsJSON,
      sections,
      references: panelReferences,
    } = panels
      ? transformPanelsIn(panels)
      : {
          panelsJSON: '',
          sections: undefined,
          references: [],
        };

    const { searchSourceJSON, references: searchSourceReferences } = transformSearchSourceIn(
      filters,
      query
    );

    const { controlsJSON, references: controlGroupReferences } =
      transformControlGroupIn(pinned_panels);

    const attributes = {
      description: '',
      ...rest,
      ...(controlsJSON && {
        controlGroupInput: {
          panelsJSON: controlsJSON,
        },
      }),
      optionsJSON: transformOptionsIn(options),
      panelsJSON,
      ...(refresh_interval && { refreshInterval: refresh_interval }),
      ...(sections?.length && { sections }),
      ...(time_range
        ? { timeFrom: time_range.from, timeTo: time_range.to, timeRestore: true }
        : { timeRestore: false }),
      kibanaSavedObjectMeta: { searchSourceJSON },
      ...(project_routing !== undefined && { projectRouting: project_routing }),
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

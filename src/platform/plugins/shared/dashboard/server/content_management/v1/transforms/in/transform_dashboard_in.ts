/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { tagSavedObjectTypeName } from '@kbn/saved-objects-tagging-plugin/common';
import type { DashboardState } from '../../types';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import { transformPanelsIn } from './transform_panels_in';
import { transformControlGroupIn } from './transform_control_group_in';
import { transformSearchSourceIn } from './transform_search_source_in';
import { transformTagsIn } from './transform_tags_in';

export const transformDashboardIn = ({
  dashboardState,
  incomingReferences = [],
}: {
  dashboardState: DashboardState;
  incomingReferences?: SavedObjectReference[];
}):
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
    const { controlGroupInput, options, filters, panels, query, tags, timeRange, ...rest } =
      dashboardState;

    const tagReferences = transformTagsIn({
      tags,
      references: incomingReferences,
    });

    // TODO - remove once all references are provided server side
    const nonTagIncomingReferences = incomingReferences.filter(
      ({ type }) => type !== tagSavedObjectTypeName
    );

    const { panelsJSON, sections, references: panelReferences } = transformPanelsIn(panels);

    const { searchSourceJSON, references: searchSourceReferences } = transformSearchSourceIn(
      filters,
      query
    );

    const attributes = {
      description: '',
      ...rest,
      ...(controlGroupInput && {
        controlGroupInput: transformControlGroupIn(controlGroupInput),
      }),
      optionsJSON: JSON.stringify(options ?? {}),
      ...(panels && {
        panelsJSON,
      }),
      ...(sections?.length && { sections }),
      ...(timeRange
        ? { timeFrom: timeRange.from, timeTo: timeRange.to, timeRestore: true }
        : { timeRestore: false }),
      kibanaSavedObjectMeta: { searchSourceJSON },
    };
    return {
      attributes,
      references: [
        ...tagReferences,
        ...nonTagIncomingReferences,
        ...panelReferences,
        ...searchSourceReferences,
      ],
      error: null,
    };
  } catch (e) {
    return { attributes: null, references: null, error: e };
  }
};

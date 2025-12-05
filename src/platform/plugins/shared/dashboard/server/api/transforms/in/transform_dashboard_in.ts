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
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import { transformPanelsIn } from './transform_panels_in';
import { transformControlGroupIn } from './transform_control_group_in';
import { transformSearchSourceIn } from './transform_search_source_in';
import { transformTagsIn } from './transform_tags_in';
import { isSearchSourceReference } from '../out/transform_references_out';

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
      controlGroupInput,
      options,
      filters,
      panels,
      query,
      references: incomingReferences,
      tags,
      timeRange,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      project_routing,
      ...rest
    } = dashboardState;

    // TODO remove when references are removed from API
    const hasTagReference = (incomingReferences ?? []).some(
      ({ type }) => type === tagSavedObjectTypeName
    );
    if (hasTagReference) {
      throw new Error(`Tag references are not supported. Pass tags in with 'data.tags'`);
    }
    // TODO remove when references are removed from API
    const hasSearchSourceReference = (incomingReferences ?? []).some(isSearchSourceReference);
    if (hasSearchSourceReference) {
      throw new Error(
        `Search source references are not supported. Pass filters in with injected references'`
      );
    }

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

    const attributes = {
      description: '',
      ...rest,
      ...(controlGroupInput && {
        controlGroupInput: transformControlGroupIn(controlGroupInput),
      }),
      optionsJSON: JSON.stringify(options ?? {}),
      panelsJSON,
      ...(sections?.length && { sections }),
      ...(timeRange
        ? { timeFrom: timeRange.from, timeTo: timeRange.to, timeRestore: true }
        : { timeRestore: false }),
      kibanaSavedObjectMeta: { searchSourceJSON },
      ...(project_routing !== undefined && { projectRouting: project_routing }),
    };
    return {
      attributes,
      references: [
        ...tagReferences,
        ...(incomingReferences ?? []),
        ...panelReferences,
        ...searchSourceReferences,
      ],
      error: null,
    };
  } catch (e) {
    return { attributes: null, references: null, error: e };
  }
};

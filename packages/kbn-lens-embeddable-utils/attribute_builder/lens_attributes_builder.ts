/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  LensAttributes,
  LensVisualizationState,
  Chart,
  VisualizationAttributesBuilder,
} from './types';
import { DataViewCache } from './data_view_cache';
import { getAdhocDataView } from './utils';

export class LensAttributesBuilder<T extends Chart<LensVisualizationState>>
  implements VisualizationAttributesBuilder
{
  private dataViewCache: DataViewCache;
  constructor(private lens: { visualization: T }) {
    this.dataViewCache = DataViewCache.getInstance();
  }

  build(): LensAttributes {
    const { visualization } = this.lens;
    return {
      title: visualization.getTitle(),
      visualizationType: visualization.getVisualizationType(),
      references: visualization.getReferences(),
      state: {
        datasourceStates: {
          formBased: {
            layers: visualization.getLayers(),
          },
        },
        internalReferences: visualization.getReferences(),
        // EmbeddableComponent receive filters.
        filters: [],
        // EmbeddableComponent receive query.
        query: { language: 'kuery', query: '' },
        visualization: visualization.getVisualizationState(),
        // Getting the spec from a data view is a heavy operation, that's why the result is cached.
        adHocDataViews: getAdhocDataView(
          visualization
            .getDataViews()
            .reduce((acc, curr) => ({ ...acc, ...this.dataViewCache.getSpec(curr) }), {})
        ),
      },
    };
  }
}

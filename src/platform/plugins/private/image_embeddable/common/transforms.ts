/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { flow } from 'lodash';
import type { ImageEmbeddableState } from '../server';

export function getTransforms(drilldownTransforms: DrilldownTransforms) {
  return {
    transformIn: (state: ImageEmbeddableState) => {
      return drilldownTransforms.transformIn(state);
    },
    transformOut: (storedState: ImageEmbeddableState, references?: Reference[]) => {
      const transformsFlow = flow(
        transformTitlesOut<ImageEmbeddableState>,
        (state: ImageEmbeddableState) => drilldownTransforms.transformOut(state, references)
      );
      return transformsFlow(storedState);
    },
  };
}

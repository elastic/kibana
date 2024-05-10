/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import { extractSearchSourceReferences } from '@kbn/data-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { SerializedTitles } from '@kbn/presentation-publishing';
import { cloneDeep, omit } from 'lodash';
import {
  deserializeReferences,
  serializeReferences,
} from '../utils/saved_visualization_references';
import type { SerializedVis } from '../vis';
import type { VisualizeSerializedState } from './types';

export const deserializeState = (state: SerializedPanelState<VisualizeSerializedState>) => {
  const serializedState = cloneDeep(state.rawState);
  const references: Reference[] = state.references ?? [];
  const { data } = serializedState.savedVis;
  let serializedSearchSource = data.searchSource as SerializedSearchSourceFields & {
    indexRefName: string;
  };
  if (!('indexRefName' in data.searchSource)) {
    // due to a bug in 8.0, some visualizations were saved with an injected state - re-extract in that case and inject the upstream references because they might have changed
    serializedSearchSource = extractSearchSourceReferences(
      serializedSearchSource
    )[0] as SerializedSearchSourceFields & {
      indexRefName: string;
    };
  }
  const { references: deserializedReferences, deserializedSearchSource } = deserializeReferences(
    {
      ...serializedState,
      savedVis: {
        ...serializedState.savedVis,
        data: { ...data, searchSource: serializedSearchSource },
      },
    },
    references
  );
  return {
    ...serializedState,
    savedVis: {
      ...serializedState.savedVis,
      data: {
        ...data,
        searchSource: deserializedSearchSource,
        savedSearchId: deserializedReferences.find((r) => r.name === 'search_0')?.id,
      },
    },
  } as VisualizeSerializedState;
};

export const serializeState = ({
  savedVis,
  id,
  titles,
}: {
  savedVis: SerializedVis;
  id: string;
  titles: SerializedTitles;
}) => {
  const { references, serializedSearchSource } = serializeReferences(savedVis);

  return {
    rawState: {
      ...titles,
      id,
      savedVis: {
        ...savedVis,
        data: {
          ...omit(savedVis.data, 'savedSearchId'),
          searchSource: serializedSearchSource,
          ...(savedVis.data.savedSearchId
            ? {
                savedSearchRefName: references.find((r) => r.id === savedVis.data.savedSearchId),
              }
            : {}),
        },
      },
    },
    references,
  };
};

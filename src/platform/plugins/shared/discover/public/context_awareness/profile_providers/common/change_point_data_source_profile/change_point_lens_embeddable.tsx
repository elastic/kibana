/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, type SerializedStyles } from '@emotion/react';
import type { UseEuiThemeReturn } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type {
  LensEmbeddableInput,
  LensPublicStart,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import React from 'react';

/** Shared fetch / reload inputs passed from Discover chart section or doc viewer tab. */
export interface ChangePointLensFetchSlice {
  abortController?: AbortController;
  lastReloadRequestTime?: number;
  searchSessionId?: string;
  timeRange?: TimeRange;
}

export interface ChangePointLensEmbeddableProps extends ChangePointLensFetchSlice {
  lens: LensPublicStart;
  attributes: TypedLensByValueInput['attributes'];
  id: string;
  executionContextDescription: string;
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  onFilter?: LensEmbeddableInput['onFilter'];
  syncCursor?: boolean;
  syncTooltips?: boolean;
  /** Emotion styles for the outer div that positions the Lens embeddable */
  wrapperCss: SerializedStyles;
  dataTestSubj?: string;
}

/**
 * Lens line chart used for Discover change point experience (multiple-line, heatmap detail)
 * and the change point document viewer tab.
 */
export const ChangePointLensEmbeddable: React.FC<ChangePointLensEmbeddableProps> = ({
  lens,
  attributes,
  abortController,
  id,
  executionContextDescription,
  lastReloadRequestTime,
  searchSessionId,
  timeRange,
  onBrushEnd,
  onFilter,
  syncCursor,
  syncTooltips,
  wrapperCss,
  dataTestSubj,
}) => {
  const { EmbeddableComponent } = lens;
  return (
    <div css={wrapperCss} data-test-subj={dataTestSubj}>
      <EmbeddableComponent
        abortController={abortController}
        attributes={attributes}
        executionContext={{ description: executionContextDescription }}
        id={id}
        lastReloadRequestTime={lastReloadRequestTime}
        noPadding={true}
        onBrushEnd={onBrushEnd}
        onFilter={onFilter}
        searchSessionId={searchSessionId}
        syncCursor={syncCursor}
        syncTooltips={syncTooltips}
        timeRange={timeRange}
        viewMode="view"
      />
    </div>
  );
};

/** Main chart area in the change point experience (full-width line chart). */
export const changePointExperienceLensWrapperCss = (euiTheme: UseEuiThemeReturn['euiTheme']) =>
  css({
    flex: 1,
    marginBlock: euiTheme.size.xs,
    minHeight: 350,
    position: 'relative',
    '& > div': {
      height: '100%',
      position: 'absolute',
      width: '100%',
    },
  });

/** Nested chart cell (multi-entity grid or heatmap entity detail). */
export const changePointLensNestedChartWrapperCss = () =>
  css({
    minHeight: 200,
    height: '100%',
    position: 'relative',
    '& > div': {
      height: '100%',
      position: 'absolute',
      width: '100%',
    },
  });

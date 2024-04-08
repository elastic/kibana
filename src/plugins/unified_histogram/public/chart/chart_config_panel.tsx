/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Observable } from 'rxjs';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isEqual } from 'lodash';
import type { LensEmbeddableOutput, Suggestion } from '@kbn/lens-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { deriveLensSuggestionFromLensAttributes } from '../utils/external_vis_context';

import {
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramSuggestionType,
  UnifiedHistogramVisContext,
} from '../types';

export function ChartConfigPanel({
  services,
  visContext,
  lensAdapters,
  lensEmbeddableOutput$,
  currentSuggestionContext,
  isFlyoutVisible,
  setIsFlyoutVisible,
  isPlainRecord,
  query,
  onSuggestionContextChange,
}: {
  services: UnifiedHistogramServices;
  visContext: UnifiedHistogramVisContext;
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: (flag: boolean) => void;
  lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
  lensEmbeddableOutput$?: Observable<LensEmbeddableOutput>;
  currentSuggestionContext: UnifiedHistogramSuggestionContext;
  isPlainRecord?: boolean;
  query?: Query | AggregateQuery;
  onSuggestionContextChange: (suggestion: UnifiedHistogramSuggestionContext | undefined) => void;
}) {
  const [editLensConfigPanel, setEditLensConfigPanel] = useState<JSX.Element | null>(null);
  const previousAdapters = useRef<Record<string, Datatable> | undefined>(undefined);
  const previousQuery = useRef<Query | AggregateQuery | undefined>(undefined);

  const updatePanelState = useCallback(
    (datasourceState, visualizationState, visualizationId) => {
      const updatedSuggestion: Suggestion = {
        ...currentSuggestionContext?.suggestion,
        visualizationId: visualizationId ?? currentSuggestionContext?.suggestion?.visualizationId,
        ...(datasourceState && { datasourceState }),
        ...(visualizationState && { visualizationState }),
      };
      onSuggestionContextChange({
        ...currentSuggestionContext,
        suggestion: updatedSuggestion,
      });
      // console.log('updatePanelState', datasourceState, visualizationState, updatedSuggestion);
    },
    [currentSuggestionContext, onSuggestionContextChange]
  );
  const updateSuggestion = useCallback(
    (attributes) => {
      const updatedSuggestion = deriveLensSuggestionFromLensAttributes({
        externalVisContext: {
          ...visContext,
          attributes,
        },
        queryParams: null, // skip query matching
      });
      onSuggestionContextChange({
        type: UnifiedHistogramSuggestionType.lensSuggestion,
        suggestion: updatedSuggestion,
      });
      // console.log('updateSuggestion', attributes, updatedSuggestion);
    },
    [onSuggestionContextChange, visContext]
  );

  const currentSuggestion = currentSuggestionContext.suggestion;
  const currentSuggestionType = currentSuggestionContext.type;

  useEffect(() => {
    const tablesAdapters = lensAdapters?.tables?.tables;
    const dataHasChanged =
      Boolean(tablesAdapters) &&
      !isEqual(previousAdapters.current, tablesAdapters) &&
      query !== previousQuery?.current;
    async function fetchLensConfigComponent() {
      const Component = await services.lens.EditLensConfigPanelApi();
      const panel = (
        <Component
          attributes={visContext.attributes}
          updateSuggestion={updateSuggestion}
          updatePanelState={updatePanelState}
          lensAdapters={lensAdapters}
          output$={lensEmbeddableOutput$}
          displayFlyoutHeader
          closeFlyout={() => {
            setIsFlyoutVisible(false);
          }}
          wrapInFlyout
          datasourceId="textBased"
          hidesSuggestions={currentSuggestionType !== UnifiedHistogramSuggestionType.lensSuggestion}
        />
      );
      setEditLensConfigPanel(panel);
      previousAdapters.current = tablesAdapters;
      if (dataHasChanged) {
        previousQuery.current = query;
      }
    }
    // rerender the component if the data has changed
    if (isPlainRecord && (dataHasChanged || !isFlyoutVisible)) {
      fetchLensConfigComponent();
    }
  }, [
    visContext.attributes,
    services.lens,
    updateSuggestion,
    updatePanelState,
    isPlainRecord,
    currentSuggestion,
    query,
    isFlyoutVisible,
    setIsFlyoutVisible,
    lensAdapters,
    lensEmbeddableOutput$,
    currentSuggestionType,
  ]);

  return isPlainRecord ? editLensConfigPanel : null;
}

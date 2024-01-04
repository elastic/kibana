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

import type { UnifiedHistogramServices, UnifiedHistogramChartLoadEvent } from '../types';
import type { LensAttributesContext } from './utils/get_lens_attributes';

export function ChartConfigPanel({
  services,
  lensAttributesContext,
  lensAdapters,
  lensEmbeddableOutput$,
  currentSuggestion,
  isFlyoutVisible,
  setIsFlyoutVisible,
  isPlainRecord,
  query,
  onSuggestionChange,
}: {
  services: UnifiedHistogramServices;
  lensAttributesContext: LensAttributesContext;
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: (flag: boolean) => void;
  lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
  lensEmbeddableOutput$?: Observable<LensEmbeddableOutput>;
  currentSuggestion?: Suggestion;
  isPlainRecord?: boolean;
  query?: Query | AggregateQuery;
  onSuggestionChange?: (suggestion: Suggestion | undefined) => void;
}) {
  const [editLensConfigPanel, setEditLensConfigPanel] = useState<JSX.Element | null>(null);
  const previousSuggestion = useRef<Suggestion | undefined>(undefined);
  const previousAdapters = useRef<Record<string, Datatable> | undefined>(undefined);
  const previousQuery = useRef<Query | AggregateQuery | undefined>(undefined);
  const updateSuggestion = useCallback(
    (datasourceState, visualizationState) => {
      const updatedSuggestion = {
        ...currentSuggestion,
        ...(datasourceState && { datasourceState }),
        ...(visualizationState && { visualizationState }),
      } as Suggestion;
      onSuggestionChange?.(updatedSuggestion);
    },
    [currentSuggestion, onSuggestionChange]
  );

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
          attributes={lensAttributesContext.attributes}
          updatePanelState={updateSuggestion}
          lensAdapters={lensAdapters}
          output$={lensEmbeddableOutput$}
          displayFlyoutHeader
          closeFlyout={() => {
            setIsFlyoutVisible(false);
          }}
          wrapInFlyout
          datasourceId="textBased"
          hidesSuggestions
        />
      );
      setEditLensConfigPanel(panel);
      previousSuggestion.current = currentSuggestion;
      previousAdapters.current = tablesAdapters;
      if (dataHasChanged) {
        previousQuery.current = query;
      }
    }
    const suggestionHasChanged = currentSuggestion?.title !== previousSuggestion?.current?.title;
    // rerender the component if the data has changed or the suggestion
    // as I can have different suggestions for the same data
    if (isPlainRecord && (dataHasChanged || suggestionHasChanged || !isFlyoutVisible)) {
      fetchLensConfigComponent();
    }
  }, [
    lensAttributesContext.attributes,
    services.lens,
    updateSuggestion,
    isPlainRecord,
    currentSuggestion,
    query,
    isFlyoutVisible,
    setIsFlyoutVisible,
    lensAdapters,
    lensEmbeddableOutput$,
  ]);

  return isPlainRecord ? editLensConfigPanel : null;
}

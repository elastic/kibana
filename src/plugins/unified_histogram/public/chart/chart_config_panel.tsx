/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import type { Observable } from 'rxjs';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isEqual, isObject } from 'lodash';
import type { LensEmbeddableOutput, Suggestion } from '@kbn/lens-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { EditLensConfigPanelComponent } from '@kbn/lens-plugin/public/plugin';
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
  onSuggestionContextEdit,
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
  onSuggestionContextEdit: (suggestion: UnifiedHistogramSuggestionContext | undefined) => void;
}) {
  const [editLensConfigPanel, setEditLensConfigPanel] = useState<JSX.Element | null>(null);
  const previousSuggestion = useRef<Suggestion | undefined>(undefined);
  const previousAdapters = useRef<Record<string, Datatable> | undefined>(undefined);
  const previousQuery = useRef<Query | AggregateQuery | undefined>(undefined);

  const updatePanelState = useCallback<
    ComponentProps<EditLensConfigPanelComponent>['updatePanelState']
  >(
    (datasourceState, visualizationState, visualizationId) => {
      const updatedSuggestion: Suggestion = {
        ...currentSuggestionContext.suggestion!,
        visualizationId:
          visualizationId ?? currentSuggestionContext.suggestion?.visualizationId ?? '',
        ...(isObject(datasourceState) && { datasourceState }),
        ...(isObject(visualizationState) && { visualizationState }),
      };
      onSuggestionContextEdit({
        ...currentSuggestionContext,
        suggestion: updatedSuggestion,
      });
    },
    [currentSuggestionContext, onSuggestionContextEdit]
  );

  const updateSuggestion = useCallback<
    NonNullable<ComponentProps<EditLensConfigPanelComponent>['updateSuggestion']>
  >(
    (attributes) => {
      const updatedSuggestion = deriveLensSuggestionFromLensAttributes({
        externalVisContext: {
          ...visContext,
          attributes,
        },
        queryParams: null, // skip validation for matching query
      });
      onSuggestionContextEdit({
        type: UnifiedHistogramSuggestionType.lensSuggestion,
        suggestion: updatedSuggestion,
      });
    },
    [onSuggestionContextEdit, visContext]
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
      previousSuggestion.current = currentSuggestion;
      previousAdapters.current = tablesAdapters;
      if (dataHasChanged) {
        previousQuery.current = query;
      }
    }
    const suggestionHasChanged = currentSuggestion?.title !== previousSuggestion?.current?.title;
    // rerender the component if the data has changed
    if (isPlainRecord && (dataHasChanged || suggestionHasChanged || !isFlyoutVisible)) {
      fetchLensConfigComponent();
    }
  }, [
    visContext.attributes,
    services.lens,
    updatePanelState,
    updateSuggestion,
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

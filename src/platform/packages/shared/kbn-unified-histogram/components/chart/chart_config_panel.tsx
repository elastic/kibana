/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isEqual, isObject } from 'lodash';
import type { LensEmbeddableOutput, Suggestion } from '@kbn/lens-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { EditLensConfigPanelComponent } from '@kbn/lens-plugin/public/plugin';
import { DiscoverFlyouts, dismissAllFlyoutsExceptFor } from '@kbn/discover-utils';
import { deriveLensSuggestionFromLensAttributes } from '../../utils/external_vis_context';

import type {
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramVisContext,
} from '../../types';
import { UnifiedHistogramSuggestionType } from '../../types';

export function ChartConfigPanel({
  services,
  visContext,
  lensAdapters,
  dataLoading$,
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
  dataLoading$?: LensEmbeddableOutput['dataLoading$'];
  currentSuggestionContext: UnifiedHistogramSuggestionContext;
  isPlainRecord?: boolean;
  query?: Query | AggregateQuery;
  onSuggestionContextEdit: (suggestion: UnifiedHistogramSuggestionContext | undefined) => void;
}) {
  const [editLensConfigPanel, setEditLensConfigPanel] = useState<JSX.Element | null>(null);
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
          dataLoading$={dataLoading$}
          displayFlyoutHeader
          closeFlyout={() => {
            setIsFlyoutVisible(false);
          }}
          wrapInFlyout
          hideTextBasedEditor={true}
          hidesSuggestions={currentSuggestionType !== UnifiedHistogramSuggestionType.lensSuggestion}
        />
      );
      setEditLensConfigPanel(panel);
      previousAdapters.current = tablesAdapters;
      if (dataHasChanged) {
        previousQuery.current = query;
      }
    }
    // rerender the component if the data has changed or flyout becomes visible
    // Note: when suggestion/chart type changes while flyout is visible, it flows through
    // visContext.attributes props instead of recreating the component (which would reset state)
    if (isPlainRecord && (dataHasChanged || !isFlyoutVisible)) {
      fetchLensConfigComponent();
    }
  }, [
    visContext.attributes,
    services.lens,
    updatePanelState,
    updateSuggestion,
    isPlainRecord,
    query,
    isFlyoutVisible,
    setIsFlyoutVisible,
    lensAdapters,
    dataLoading$,
    currentSuggestionType,
  ]);

  const flyoutElement = isPlainRecord ? editLensConfigPanel : null;

  useEffect(() => {
    if (flyoutElement) {
      dismissAllFlyoutsExceptFor(DiscoverFlyouts.lensEdit);
    }
  }, [flyoutElement]);

  return flyoutElement;
}

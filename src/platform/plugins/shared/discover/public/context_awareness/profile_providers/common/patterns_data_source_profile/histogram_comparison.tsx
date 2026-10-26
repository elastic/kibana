/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { constructCascadeQuery, getESQLStatsQueryMeta } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { RowControlColumn } from '@kbn/discover-utils';
import React from 'react';
import { distinctUntilChanged, map } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  PATTERNS_HISTOGRAM_COMPARISON_STATE_DEFAULTS,
  PATTERNS_HISTOGRAM_COMPARISON_STATE_DEF,
  type PatternsHistogramComparisonState,
} from '../../../../../common/context_awareness';
import type { ContextAwarenessToolkit } from '../../../toolkit';
import type {
  HistogramComparisonContext,
  HistogramComparisonController,
  HistogramComparisonSelection,
  HistogramComparisonTableSelection,
  RowControlsExtensionParams,
} from '../../../types';
import type { DataSourceProfileProvider } from '../../../profiles';

const compareWithTotalLabel = i18n.translate('discover.patternsProfile.compareWithTotal', {
  defaultMessage: 'Compare with total',
});

const stopComparingLabel = i18n.translate('discover.patternsProfile.stopComparingWithTotal', {
  defaultMessage: 'Stop comparing with total',
});

const orderedFilterTooltip = i18n.translate('discover.patternsProfile.compareWithTotalTooltip', {
  defaultMessage:
    'Compare this pattern with total document volume. The comparison counts messages that match the pattern’s words in order.',
});

const variablesFingerprint = (variables: HistogramComparisonContext['esqlVariables']): string =>
  JSON.stringify(variables ?? []);

export const getComparableCategorizeColumn = (esql: string | undefined): string | undefined => {
  if (!esql) {
    return undefined;
  }

  const { groupByFields } = getESQLStatsQueryMeta(esql);
  if (groupByFields.length !== 1 || groupByFields[0].type !== 'categorize') {
    return undefined;
  }

  return groupByFields[0].field;
};

const selectionFromState = (
  state: PatternsHistogramComparisonState,
  params: HistogramComparisonContext
): HistogramComparisonSelection | undefined => {
  const esql = isOfAggregateQueryType(params.query) ? params.query.esql : undefined;
  const column = getComparableCategorizeColumn(esql);

  if (
    !params.defaultHistogramAvailable ||
    !column ||
    !esql ||
    state.column !== column ||
    state.sourceQuery !== esql ||
    state.sourceVariables !== variablesFingerprint(params.esqlVariables) ||
    state.documentQuery.length === 0
  ) {
    return undefined;
  }

  return {
    key: JSON.stringify([state.column, state.value, state.sourceQuery, state.sourceVariables]),
    label: state.label,
    column: state.column,
    value: state.value,
    documentQuery: state.documentQuery,
  };
};

const clearComparison = (toolkit: ContextAwarenessToolkit) => {
  toolkit
    .getStateAdapter(PATTERNS_HISTOGRAM_COMPARISON_STATE_DEF)
    .setState(PATTERNS_HISTOGRAM_COMPARISON_STATE_DEFAULTS);
};

/** Writes a pattern selection. Returns false when another profile should handle the selection. */
export const publishPatternsHistogramComparison = (
  toolkit: ContextAwarenessToolkit,
  params: HistogramComparisonTableSelection | undefined
): boolean => {
  if (!params) {
    // Clearing is passed to every profile in the chain so each owner drops its selection.
    clearComparison(toolkit);
    return false;
  }

  const column = getComparableCategorizeColumn(params.query.esql);
  if (!column || column !== params.column) {
    return false;
  }

  const sourceVariables = variablesFingerprint(params.esqlVariables);
  const adapter = toolkit.getStateAdapter(PATTERNS_HISTOGRAM_COMPARISON_STATE_DEF);
  const current = adapter.getState();
  if (
    current.label === params.label &&
    current.column === params.column &&
    current.value === params.value &&
    current.sourceQuery === params.query.esql &&
    current.sourceVariables === sourceVariables
  ) {
    return true;
  }

  let documentQuery: string | undefined;
  try {
    documentQuery = constructCascadeQuery({
      query: params.query,
      dataView: params.dataView,
      esqlVariables: params.esqlVariables,
      nodeType: 'leaf',
      nodePath: [params.column],
      nodePathMap: { [params.column]: params.value },
    })?.esql;
  } catch {
    clearComparison(toolkit);
    return true;
  }

  if (!documentQuery || !params.label || !params.value) {
    clearComparison(toolkit);
    return true;
  }

  adapter.setState({
    label: params.label,
    column: params.column,
    value: params.value,
    documentQuery,
    sourceQuery: params.query.esql,
    sourceVariables,
  });
  return true;
};

export const createPatternsHistogramComparison = (
  toolkit: ContextAwarenessToolkit,
  params: HistogramComparisonContext
): HistogramComparisonController => {
  const state$ = toolkit.getStateAdapter(PATTERNS_HISTOGRAM_COMPARISON_STATE_DEF).getState$();

  return {
    selection$: state$.pipe(
      map((state) => selectionFromState(state, params)),
      distinctUntilChanged((previous, current) => previous?.key === current?.key)
    ),
  };
};

const formatPatternLabel = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export const getPatternsRowAdditionalLeadingControls: DataSourceProfileProvider['profile']['getRowAdditionalLeadingControls'] =

    (prev, { toolkit }) =>
    (params: RowControlsExtensionParams) => {
      const additionalControls = prev(params) || [];
      const esql = isOfAggregateQueryType(params.query) ? params.query.esql : undefined;
      const column = getComparableCategorizeColumn(esql);
      if (
        !params.histogramComparisonEnabled ||
        !column ||
        !params.query ||
        !isOfAggregateQueryType(params.query)
      ) {
        return additionalControls;
      }

      const query = params.query;
      const control: RowControlColumn = {
        id: 'compareWithTotal',
        isAvailable: ({ record }) => formatPatternLabel(record.flattened[column]) !== undefined,
        render: (Control, { record }) => (
          <CompareWithTotalControl
            Control={Control}
            column={column}
            label={formatPatternLabel(record.flattened[column])!}
            query={query}
            dataView={params.dataView}
            esqlVariables={params.esqlVariables}
            toolkit={toolkit}
          />
        ),
      };

      return [...additionalControls, control];
    };

const CompareWithTotalControl = ({
  Control,
  column,
  label,
  query,
  dataView,
  esqlVariables,
  toolkit,
}: {
  Control: Parameters<RowControlColumn['render']>[0];
  column: string;
  label: string;
  query: HistogramComparisonTableSelection['query'];
  dataView: HistogramComparisonTableSelection['dataView'];
  esqlVariables: HistogramComparisonTableSelection['esqlVariables'];
  toolkit: ContextAwarenessToolkit;
}) => {
  const adapter = toolkit.getStateAdapter(PATTERNS_HISTOGRAM_COMPARISON_STATE_DEF);
  const state = useObservable(adapter.getState$(), adapter.getState());
  const selected =
    state.column === column &&
    state.value === label &&
    state.sourceQuery === query.esql &&
    state.sourceVariables === variablesFingerprint(esqlVariables);

  return (
    <Control
      data-test-subj="discoverCompareWithTotal"
      iconType="chartBarVerticalStack"
      color={selected ? 'primary' : 'text'}
      label={selected ? stopComparingLabel : compareWithTotalLabel}
      tooltipContent={orderedFilterTooltip}
      onClick={() => {
        publishPatternsHistogramComparison(
          toolkit,
          selected
            ? undefined
            : {
                label,
                column,
                value: label,
                query,
                dataView,
                esqlVariables,
              }
        );
      }}
    />
  );
};

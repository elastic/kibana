/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import * as dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { buildQueryFilter, compareFilters } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getDataViews } from '../services';
import { extractIndexPatternsFromSpec } from '../lib/extract_index_pattern';
import { VEGA_EVENT_APPLY_FILTER } from '../constants';
import type { VegaSpec } from '../data_model/types';
import type { VegaEventHandler, VegaFilterActionHandler } from '../types';
import { normalizeDate, normalizeObject, normalizeString } from './utils';

type TimeValue = ReturnType<typeof normalizeDate>;

interface VegaFilterActionHandlerDeps {
  /** The spec as authored (Vega-Lite or Vega); its data sources pick the index when none is given. */
  spec: VegaSpec;
  filterManager: DataPublicPluginStart['query']['filterManager'];
  fireEvent: VegaEventHandler;
}

const getFunctionIsNotDefinedError = (fn: unknown) =>
  new Error(
    i18n.translate('visTypeVega.vegaParser.baseView.functionIsNotDefinedForGraphErrorMessage', {
      defaultMessage: '{funcName} is not defined for this graph',
      values: { funcName: `${typeof fn === 'string' ? fn : typeof fn}()` },
    })
  );

/** Parses start and end values, determining the mode, and if order should be reversed. */
const parseTimeRange = (start: TimeValue, end: TimeValue) => {
  const absStart = moment(start);
  const absEnd = moment(end);
  const isValidAbsStart = absStart.isValid();
  const isValidAbsEnd = absEnd.isValid();
  let mode: 'absolute' | 'relative' = 'absolute';
  let from: moment.Moment | TimeValue;
  let to: moment.Moment | TimeValue;
  let reverse: boolean;

  if (isValidAbsStart && isValidAbsEnd) {
    // Both are valid absolute dates.
    from = absStart;
    to = absEnd;
    reverse = absStart.isAfter(absEnd);
  } else {
    // Try to parse as relative dates too (absolute dates will also be accepted)
    const startDate = dateMath.parse(start);
    const endDate = dateMath.parse(end);
    if (!startDate || !endDate || !startDate.isValid() || !endDate.isValid()) {
      throw new Error(
        i18n.translate('visTypeVega.vegaParser.baseView.timeValuesTypeErrorMessage', {
          defaultMessage:
            'Error setting time filter: both time values must be either relative or absolute dates. {start}, {end}',
          values: {
            start: `start=${JSON.stringify(start)}`,
            end: `end=${JSON.stringify(end)}`,
          },
        })
      );
    }
    reverse = startDate.isAfter(endDate);
    if (isValidAbsStart || isValidAbsEnd) {
      // Mixing relative and absolute - treat them as absolute
      from = startDate;
      to = endDate;
    } else {
      // Both dates are relative
      mode = 'relative';
      from = start;
      to = end;
    }
  }

  if (reverse) {
    [from, to] = [to, from];
  }

  return { from, to, mode };
};

/** Creates the parent-side handler that validates and applies a Vega view's filter actions. */
export const createVegaFilterActionHandler = ({
  spec,
  filterManager,
  fireEvent,
}: VegaFilterActionHandlerDeps): VegaFilterActionHandler => {
  const findIndex = async (index?: string): Promise<string | undefined> => {
    const dataViews = getDataViews();

    if (index) {
      const [dataView] = await dataViews.find(index, 1);
      if (!dataView) {
        throw new Error(
          i18n.translate('visTypeVega.vegaParser.baseView.indexNotFoundErrorMessage', {
            defaultMessage: 'Index {index} not found',
            values: { index: `"${index}"` },
          })
        );
      }
      return dataView.id;
    }

    const [specDataView] = await extractIndexPatternsFromSpec(spec);
    const dataView = specDataView ?? (await dataViews.getDefault());
    if (!dataView) {
      throw new Error(
        i18n.translate('visTypeVega.vegaParser.baseView.unableToFindDefaultIndexErrorMessage', {
          defaultMessage: 'Unable to find default index',
        })
      );
    }
    return dataView.id;
  };

  const buildFilter = async (query: unknown, index: unknown, alias?: unknown) => {
    const normalizedQuery = normalizeObject(query);
    const indexId = await findIndex(normalizeString(index));
    return buildQueryFilter(normalizedQuery, indexId ?? '', normalizeString(alias));
  };

  const addFilter = async (query: unknown, index: unknown, alias: unknown) => {
    const filter = await buildFilter(query, index, alias);
    fireEvent({ name: VEGA_EVENT_APPLY_FILTER, data: { filters: [filter] } });
  };

  const removeFilter = async (query: unknown, index: unknown) => {
    const filterToRemove = await buildFilter(query, index);
    const existingFilter = filterManager
      .getFilters()
      .find((filter) => compareFilters(filter, filterToRemove));

    if (existingFilter) {
      filterManager.removeFilter(existingFilter);
    }
  };

  const setTimeFilter = (start: unknown, end: unknown) => {
    const { from, to, mode } = parseTimeRange(normalizeDate(start), normalizeDate(end));
    // Not a stored filter: the apply-filter action turns this `*` range into the time range.
    const timeRangeFilter: Filter = {
      meta: {},
      query: { range: { '*': { mode, gte: from, lte: to } } },
    };

    fireEvent({
      name: VEGA_EVENT_APPLY_FILTER,
      data: { timeFieldName: '*', filters: [timeRangeFilter] },
    });
  };

  return async ({ fn, args }) => {
    if (!Array.isArray(args)) {
      throw getFunctionIsNotDefinedError(fn);
    }
    const [first, second, third] = args;

    // Match exact names so that inherited keys such as `__proto__` or `toString` never resolve.
    switch (fn) {
      case 'kibanaAddFilter':
        return addFilter(first, second, third);
      case 'kibanaRemoveFilter':
        return removeFilter(first, second);
      case 'kibanaRemoveAllFilters':
        return filterManager.removeAll();
      case 'kibanaSetTimeFilter':
        return setTimeFilter(first, second);
      default:
        throw getFunctionIsNotDefinedError(fn);
    }
  };
};

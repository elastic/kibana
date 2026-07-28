/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { buildQueryFilter, compareFilters } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import type { VegaRenderDescriptor } from '../data_model/types';
import { extractIndexPatternsFromSpec } from '../lib/extract_index_pattern';
import { normalizeDate, normalizeObject, normalizeString } from './utils';

export const VEGA_FUNCTION_NAMES = [
  'kibanaAddFilter',
  'kibanaRemoveFilter',
  'kibanaRemoveAllFilters',
  'kibanaSetTimeFilter',
] as const;

export type VegaFunctionName = (typeof VEGA_FUNCTION_NAMES)[number];

export interface VegaFunctionIntent {
  fn: string;
  args: unknown[];
}

interface VegaFilterActionHandlerParams {
  descriptor: VegaRenderDescriptor;
  filterManager: DataPublicPluginStart['query']['filterManager'];
  fireEvent: IInterpreterRenderHandlers['event'];
  getDataViews: () => DataViewsPublicPluginStart;
}

const isVegaFunctionName = (fn: string): fn is VegaFunctionName =>
  (VEGA_FUNCTION_NAMES as readonly string[]).includes(fn);

const getFunctionNotDefinedError = (funcName: string) =>
  new Error(
    i18n.translate('visTypeVega.vegaParser.baseView.functionIsNotDefinedForGraphErrorMessage', {
      defaultMessage: '{funcName} is not defined for this graph',
      values: { funcName: `${funcName}()` },
    })
  );

const getIndexNotFoundError = (index: string) =>
  new Error(
    i18n.translate('visTypeVega.vegaParser.baseView.indexNotFoundErrorMessage', {
      defaultMessage: 'Index {index} not found',
      values: { index: `"${index}"` },
    })
  );

const getUnableToFindDefaultIndexError = () =>
  new Error(
    i18n.translate('visTypeVega.vegaParser.baseView.unableToFindDefaultIndexErrorMessage', {
      defaultMessage: 'Unable to find default index',
    })
  );

const getInvalidTimeValuesError = (start: unknown, end: unknown) =>
  new Error(
    i18n.translate('visTypeVega.vegaParser.baseView.timeValuesTypeErrorMessage', {
      defaultMessage:
        'Error setting time filter: both time values must be either relative or absolute dates. {start}, {end}',
      values: {
        start: `start=${JSON.stringify(start)}`,
        end: `end=${JSON.stringify(end)}`,
      },
    })
  );

const getSpecForIndexSearch = (descriptor: VegaRenderDescriptor) =>
  descriptor.isVegaLite && descriptor.vlspec ? descriptor.vlspec : descriptor.spec;

const findIndex = async ({
  descriptor,
  getDataViews,
  index,
}: Pick<VegaFilterActionHandlerParams, 'descriptor' | 'getDataViews'> & { index?: string }) => {
  const dataViews = getDataViews();
  let idxObj;

  if (index) {
    [idxObj] = await dataViews.find(index, 1);
    if (!idxObj) {
      throw getIndexNotFoundError(index);
    }
  } else {
    [idxObj] = await extractIndexPatternsFromSpec(getSpecForIndexSearch(descriptor));

    if (!idxObj) {
      const defaultIdx = await dataViews.getDefault();

      if (defaultIdx) {
        idxObj = defaultIdx;
      } else {
        throw getUnableToFindDefaultIndexError();
      }
    }
  }

  return idxObj.id;
};

export const parseTimeRange = (start: unknown, end: unknown) => {
  const absStart = moment(start);
  const absEnd = moment(end);
  const isValidAbsStart = absStart.isValid();
  const isValidAbsEnd = absEnd.isValid();
  let mode = 'absolute';
  let from;
  let to;
  let reverse;

  if (isValidAbsStart && isValidAbsEnd) {
    from = absStart;
    to = absEnd;
    reverse = absStart.isAfter(absEnd);
  } else {
    const startDate = typeof start === 'string' ? dateMath.parse(start) : undefined;
    const endDate = typeof end === 'string' ? dateMath.parse(end) : undefined;
    if (!startDate || !endDate || !startDate.isValid() || !endDate.isValid()) {
      throw getInvalidTimeValuesError(start, end);
    }
    reverse = startDate.isAfter(endDate);
    if (isValidAbsStart || isValidAbsEnd) {
      from = startDate;
      to = endDate;
    } else {
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

export const createVegaFilterActionHandler =
  ({ descriptor, filterManager, fireEvent, getDataViews }: VegaFilterActionHandlerParams) =>
  async ({ fn, args }: VegaFunctionIntent): Promise<void> => {
    if (!isVegaFunctionName(fn)) {
      throw getFunctionNotDefinedError(fn);
    }

    switch (fn) {
      case 'kibanaAddFilter': {
        const [query, index, alias] = args;
        const normalizedQuery = normalizeObject(query);
        const normalizedIndex = normalizeString(index);
        const normalizedAlias = normalizeString(alias);
        const indexId = await findIndex({ descriptor, getDataViews, index: normalizedIndex });
        const filter = buildQueryFilter(normalizedQuery, indexId, normalizedAlias);

        fireEvent({ name: 'applyFilter', data: { filters: [filter] } });
        return;
      }

      case 'kibanaRemoveFilter': {
        const [query, index] = args;
        const normalizedQuery = normalizeObject(query);
        const normalizedIndex = normalizeString(index);
        const indexId = await findIndex({ descriptor, getDataViews, index: normalizedIndex });
        const filterToRemove = buildQueryFilter(normalizedQuery, indexId);
        const currentFilters = filterManager.getFilters();
        const existingFilter = currentFilters.find((filter) =>
          compareFilters(filter, filterToRemove)
        );

        if (existingFilter) {
          filterManager.removeFilter(existingFilter);
        }
        return;
      }

      case 'kibanaRemoveAllFilters':
        filterManager.removeAll();
        return;

      case 'kibanaSetTimeFilter': {
        const [start, end] = args;
        const normalizedStart = normalizeDate(start);
        const normalizedEnd = normalizeDate(end);
        const { from, to, mode } = parseTimeRange(normalizedStart, normalizedEnd);

        fireEvent({
          name: 'applyFilter',
          data: {
            timeFieldName: '*',
            filters: [
              {
                query: {
                  range: {
                    '*': {
                      mode,
                      gte: from,
                      lte: to,
                    },
                  },
                },
              },
            ],
          },
        });
      }
    }
  };

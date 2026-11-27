/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import type { MapCache } from 'lodash';
import { i18n } from '@kbn/i18n';
import { monaco, type MonacoMessage } from '@kbn/code-editor';
import {
  escapeEsqlColumnName,
  getIndexPatternFromESQLQuery,
  getResolvedESQLTimeField,
  getSourceCommandQueryFromESQLQuery,
  parseTimeFieldFromESQLQuery,
} from '@kbn/esql-utils';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { getEffectiveProjectRouting } from './use_effective_project_routing';

export const NO_TIME_FIELD_WARNING_CODE = 'noTimeField';
const NO_TIME_FIELD_DEBOUNCE_MS = 256;
const MAX_LISTED_DATE_FIELDS = 5;
const DATE_FIELD_TYPES = ['date', 'date_nanos'];
const NO_WARNINGS: MonacoMessage[] = [];

/**
 * The date fields of the source, only if its columns were already fetched by the editor:
 * the cache is read, never filled, so nothing is requested.
 */
const getCachedDateFields = async (query: string, esqlFieldsCache: MapCache): Promise<string[]> => {
  const sourceQuery = getSourceCommandQueryFromESQLQuery(query);
  const cached: { result?: Promise<ESQLFieldWithMetadata[]> } | undefined =
    esqlFieldsCache.get(sourceQuery);
  try {
    const columns = (await cached?.result) ?? [];
    return columns.filter(({ type }) => DATE_FIELD_TYPES.includes(type)).map(({ name }) => name);
  } catch (error) {
    return [];
  }
};

const getNoTimeFieldWarning = (dateFields: string[]): MonacoMessage => {
  const listedFields = dateFields.slice(0, MAX_LISTED_DATE_FIELDS);
  const exampleField = listedFields.length ? escapeEsqlColumnName(listedFields[0]) : '<date_field>';
  const example = `| WHERE ${exampleField} >= ?_tstart AND ${exampleField} < ?_tend`;
  // The example is passed as a value, as `<date_field>` would be parsed as a tag by the i18n formatter.
  const message = listedFields.length
    ? i18n.translate('esqlEditor.query.noTimeFieldWithDateFieldsWarning', {
        defaultMessage:
          'No time field was detected for this data source, so the time picker is disabled and the query runs over all of the data. To filter by time, add a condition on a date field ({dateFields}) that uses the ?_tstart and ?_tend parameters, for example: {example}',
        values: { dateFields: listedFields.join(', '), example },
      })
    : i18n.translate('esqlEditor.query.noTimeFieldWarning', {
        defaultMessage:
          'No time field was detected for this data source, so the time picker is disabled and the query runs over all of the data. To filter by time, add a condition on a date field that uses the ?_tstart and ?_tend parameters, for example: {example}',
        values: { example },
      });

  return {
    message,
    startColumn: 1,
    startLineNumber: 1,
    endColumn: 1,
    endLineNumber: 1,
    severity: monaco.MarkerSeverity.Warning,
    code: NO_TIME_FIELD_WARNING_CODE,
  };
};

/**
 * Returns a warning when the source of the query is known to have no time field.
 * It never requests anything: it only reads what was already resolved for the source,
 * e.g. when the query was last run. While nothing is known, there is no warning.
 */
export const useNoTimeFieldWarning = ({
  query,
  isEnabled,
  isLoading,
  pickerProjectRouting,
  esqlFieldsCache,
}: {
  query: string;
  isEnabled: boolean;
  isLoading: boolean | undefined;
  pickerProjectRouting: string | undefined;
  esqlFieldsCache: MapCache;
}): MonacoMessage[] => {
  // `undefined` when the source has a time field, or when it is not known yet.
  const [dateFields, setDateFields] = useState<string[] | undefined>();

  // `isLoading` is a dependency because running the query is what resolves the time field.
  useEffect(() => {
    if (!isEnabled) {
      setDateFields(undefined);
      return;
    }
    let isCancelled = false;
    const timeoutId = setTimeout(async () => {
      // No source (ROW, SHOW...), or the query already uses the time range.
      if (!getIndexPatternFromESQLQuery(query) || parseTimeFieldFromESQLQuery(query)) {
        setDateFields(undefined);
        return;
      }
      const resolved = await getResolvedESQLTimeField({
        query,
        projectRouting: getEffectiveProjectRouting(query, pickerProjectRouting),
      });
      if (isCancelled) return;
      if (!resolved.isResolved || resolved.timeField) {
        setDateFields(undefined);
        return;
      }
      const fields = await getCachedDateFields(query, esqlFieldsCache);
      if (!isCancelled) {
        setDateFields(fields);
      }
    }, NO_TIME_FIELD_DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query, isEnabled, isLoading, pickerProjectRouting, esqlFieldsCache]);

  return useMemo(
    () => (dateFields ? [getNoTimeFieldWarning(dateFields)] : NO_WARNINGS),
    [dateFields]
  );
};

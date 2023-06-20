/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { ListOperatorTypeEnum as OperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getDataViewFieldSubtypeNested } from '@kbn/es-query';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AutocompleteStart } from '@kbn/unified-search-plugin/public/autocomplete';
import { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common/types';

interface FuncArgs {
  fieldSelected: DataViewField | undefined;
  patterns: DataView | null | undefined;
  searchQuery: string;
  value: string | string[] | undefined;
}

type Func = (args: FuncArgs) => void;

export type UseFieldValueAutocompleteReturn = [boolean, boolean, string[], Func | null];

export interface UseFieldValueAutocompleteProps {
  autocompleteService: AutocompleteStart;
  fieldValue: string | string[] | undefined;
  indexPattern: DataViewSpec | undefined;
  fieldFormats: FieldFormatsStartCommon;
  operatorType: OperatorTypeEnum;
  query: string;
  selectedField: FieldSpec | undefined;
}
/**
 * Hook for using the field value autocomplete service
 */
export const useFieldValueAutocomplete = ({
  selectedField,
  operatorType,
  fieldValue,
  query,
  indexPattern,
  fieldFormats,
  autocompleteService,
}: UseFieldValueAutocompleteProps): UseFieldValueAutocompleteReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingValues, setIsSuggestingValues] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const updateSuggestions = useRef<Func | null>(null);

  const fieldMemo = useMemo(
    () => (selectedField != null ? new DataViewField(selectedField as FieldSpec) : undefined),
    [selectedField]
  );

  const dataViewMemo = useMemo(() => {
    if (indexPattern != null) {
      return new DataView({ spec: indexPattern, fieldFormats });
    } else {
      return null;
    }
  }, [indexPattern, fieldFormats]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchSuggestions = debounce(
      async ({ fieldSelected, patterns, searchQuery }: FuncArgs) => {
        try {
          if (isSubscribed) {
            if (fieldSelected == null || patterns == null) {
              return;
            }

            if (fieldSelected.type === 'boolean') {
              setIsSuggestingValues(false);
              return;
            }

            setIsLoading(true);
            const subTypeNested = getDataViewFieldSubtypeNested(fieldSelected);
            const field = subTypeNested
              ? new DataViewField({
                  ...fieldSelected.toSpec(),
                  name: `${subTypeNested.nested.path}.${fieldSelected.name}`,
                })
              : fieldSelected;

            const newSuggestions = await autocompleteService.getValueSuggestions({
              field,
              indexPattern: patterns,
              query: searchQuery,
              signal: abortCtrl.signal,
              useTimeRange: false,
            });

            if (newSuggestions.length === 0) {
              setIsSuggestingValues(false);
            }

            setIsLoading(false);
            setSuggestions([...newSuggestions]);
          }
        } catch (error) {
          if (isSubscribed) {
            setSuggestions([]);
            setIsLoading(false);
          }
        }
      },
      500
    );

    if (operatorType !== OperatorTypeEnum.EXISTS) {
      fetchSuggestions({
        fieldSelected: fieldMemo,
        patterns: dataViewMemo,
        searchQuery: query,
        value: fieldValue,
      });
    }

    updateSuggestions.current = fetchSuggestions;

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [
    selectedField,
    operatorType,
    fieldValue,
    indexPattern,
    query,
    autocompleteService,
    fieldMemo,
    dataViewMemo,
  ]);

  return [isLoading, isSuggestingValues, suggestions, updateSuggestions.current];
};

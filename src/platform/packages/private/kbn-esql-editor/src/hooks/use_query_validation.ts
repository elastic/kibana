/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { ESQLLang, monaco } from '@kbn/monaco';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import type { MapCache } from 'lodash';
import {
  filterDataErrors,
  filterDuplicatedWarnings,
  filterOutWarningsOverlappingWithErrors,
  parseErrors,
  parseWarning,
  useDebounceWithOptions,
} from '../helpers';
import { createTimedCallbacks } from '../telemetry/timed_callbacks';
import { addQueriesToCache } from '../history_local_storage';
import type { DataErrorsControl } from '../types';

interface ValidationLatencyTracking {
  trackValidationLatencyStart: (code: string) => void;
  trackValidationLatencyEnd: (active: boolean, callbacksDuration: number) => void;
  resetValidationTracking: () => void;
}

interface UseQueryValidationParams {
  code: string;
  codeWhenSubmitted: string;
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  esqlCallbacks: ESQLCallbacks;
  serverErrors: Error[] | undefined;
  serverWarning: string | undefined;
  mergeExternalMessages: boolean | undefined;
  dataErrorsControl: DataErrorsControl | undefined;
  isLoading: boolean | undefined;
  isQueryLoading: boolean;
  dataSourcesCache: MapCache;
  esqlFieldsCache: MapCache;
  getJoinIndicesCallback: Required<ESQLCallbacks>['getJoinIndices'];
  onQueryUpdate: (value: string) => void;
  pickerProjectRouting: string | undefined;
  latencyTracking: ValidationLatencyTracking;
}

export const useQueryValidation = ({
  code,
  codeWhenSubmitted,
  editorRef,
  editorModel,
  esqlCallbacks,
  serverErrors,
  serverWarning,
  mergeExternalMessages,
  dataErrorsControl,
  isLoading,
  isQueryLoading,
  dataSourcesCache,
  esqlFieldsCache,
  getJoinIndicesCallback,
  onQueryUpdate,
  pickerProjectRouting,
  latencyTracking,
}: UseQueryValidationParams) => {
  const { trackValidationLatencyStart, trackValidationLatencyEnd, resetValidationTracking } =
    latencyTracking;
  // Initial state from server errors/warnings at mount time.
  // Subsequent updates come from the debounced validation below.
  const [editorMessages, setEditorMessages] = useState<{
    errors: MonacoMessage[];
    warnings: MonacoMessage[];
  }>({
    errors: serverErrors ? parseErrors(serverErrors, code) : [],
    warnings: serverWarning ? parseWarning(serverWarning) : [],
  });

  const parseMessages = useCallback(
    async (options?: { invalidateColumnsCache?: boolean }) => {
      if (editorModel.current) {
        const { callbacks: timedCallbacks, getCallbacksDuration } =
          createTimedCallbacks(esqlCallbacks);
        const result = await ESQLLang.validate(editorModel.current, code, timedCallbacks, options);
        return { ...result, callbacksDuration: getCallbacksDuration() };
      }
      return {
        errors: [],
        warnings: [],
        callbacksDuration: 0,
      };
    },
    [esqlCallbacks, code, editorModel]
  );

  useEffect(() => {
    const setQueryToTheCache = async () => {
      if (editorRef?.current) {
        try {
          const { errors, warnings } = await parseMessages();
          const clientParserStatus = errors?.length
            ? 'error'
            : warnings.length
            ? 'warning'
            : 'success';

          addQueriesToCache({
            queryString: code,
            status: clientParserStatus,
          });
        } catch (error) {
          // Default to warning when parseMessages fails
          addQueriesToCache({
            queryString: code,
            status: 'warning',
          });
        }
      }
    };
    if (isQueryLoading || isLoading) {
      setQueryToTheCache();
    }
  }, [isLoading, isQueryLoading, parseMessages, code, editorRef]);

  const queryValidation = useCallback(
    async ({
      active,
      invalidateColumnsCache,
    }: {
      active: boolean;
      invalidateColumnsCache?: boolean;
    }) => {
      if (!editorModel.current || editorModel.current.isDisposed()) return;
      monaco.editor.setModelMarkers(editorModel.current, 'Unified search', []);
      const {
        warnings: parserWarnings,
        errors: parserErrors,
        callbacksDuration,
      } = await parseMessages({
        invalidateColumnsCache,
      });

      let allErrors = parserErrors;
      let allWarnings = parserWarnings;

      // Only merge external messages if the flag is enabled
      if (mergeExternalMessages) {
        const externalErrorsParsedErrors = serverErrors ? parseErrors(serverErrors, code) : [];
        const externalErrorsParsedWarnings = serverWarning ? parseWarning(serverWarning) : [];

        allErrors = [...parserErrors, ...externalErrorsParsedErrors];
        allWarnings = [...parserWarnings, ...externalErrorsParsedWarnings];
      }

      const underlinedWarnings = allWarnings.filter((warning) => warning.underlinedWarning);
      const nonOverlappingWarnings = filterOutWarningsOverlappingWithErrors(
        allErrors,
        underlinedWarnings
      );

      const underlinedMessages = [...allErrors, ...nonOverlappingWarnings];
      const markers = [];

      if (dataErrorsControl?.enabled === false) {
        markers.push(...filterDataErrors(underlinedMessages));
      } else {
        markers.push(...underlinedMessages);
      }

      trackValidationLatencyEnd(active, callbacksDuration);
      performance.mark('esql-validation-complete');

      if (active) {
        const uniqueWarnings = filterDuplicatedWarnings(allWarnings);
        setEditorMessages({ errors: allErrors, warnings: uniqueWarnings });
        monaco.editor.setModelMarkers(
          editorModel.current,
          'Unified search',
          // don't show the code in the editor
          // but we need it above
          markers.map((m) => ({ ...m, code: undefined }))
        );
        return;
      }
    },
    [
      parseMessages,
      serverErrors,
      code,
      serverWarning,
      dataErrorsControl?.enabled,
      mergeExternalMessages,
      trackValidationLatencyEnd,
      editorModel,
    ]
  );

  const onLookupIndexCreate = useCallback(
    async (resultQuery: string) => {
      // forces refresh
      dataSourcesCache?.clear?.();
      if (getJoinIndicesCallback) {
        await getJoinIndicesCallback({ forceRefresh: true });
      }
      onQueryUpdate(resultQuery);
      // Need to force validation, as the query might be unchanged,
      // but the lookup index was created
      await queryValidation({ active: true });
    },
    [dataSourcesCache, getJoinIndicesCallback, onQueryUpdate, queryValidation]
  );

  // Re-validate when the project picker selection changes. useObservable causes a re-render
  // (and therefore a memoizedSources cache miss) automatically; this effect handles the
  // explicit re-validation trigger.
  //
  // queryValidationRef keeps the latest queryValidation without being listed as an effect
  // dependency: including queryValidation directly would cause the effect to fire on every
  // code edit (queryValidation's identity changes whenever `code` changes), doubling the
  // validation work and causing performance test timeouts.
  const queryValidationRef = useRef(queryValidation);
  useEffect(() => {
    queryValidationRef.current = queryValidation;
  }, [queryValidation]);

  const isFirstPickerRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstPickerRenderRef.current) {
      isFirstPickerRenderRef.current = false;
      return;
    }
    queryValidationRef.current({ active: true });
  }, [pickerProjectRouting]);

  // Refresh the fields cache when a new field has been added to the lookup index
  const onNewFieldsAddedToLookupIndex = useCallback(async () => {
    esqlFieldsCache.clear?.();

    await queryValidation({ active: true, invalidateColumnsCache: true });
  }, [esqlFieldsCache, queryValidation]);

  // Debounced validation (256ms). Two paths:
  // 1. If the code hasn't changed since submission and there are server errors/warnings,
  //    show those directly (skip client validation to avoid flickering).
  // 2. Otherwise, run full client-side validation via queryValidation().
  useDebounceWithOptions(
    async () => {
      if (!editorModel.current) return;
      const subscription = { active: true };
      trackValidationLatencyStart(code);

      if (code === codeWhenSubmitted && (serverErrors || serverWarning)) {
        resetValidationTracking();

        const parsedErrors = parseErrors(serverErrors || [], code);
        const parsedWarning = serverWarning ? parseWarning(serverWarning) : [];
        setEditorMessages({
          errors: parsedErrors,
          warnings: parsedErrors.length ? [] : parsedWarning,
        });
        monaco.editor.setModelMarkers(
          editorModel.current,
          'Unified search',
          parsedErrors.length ? parsedErrors : []
        );
        return;
      }
      queryValidation(subscription)
        .catch(() => {})
        .finally(() => {
          subscription.active = false;
        });
    },
    { skipFirstRender: false },
    256,
    [serverErrors, serverWarning, code, codeWhenSubmitted, queryValidation]
  );

  return {
    editorMessages,
    queryValidation,
    onLookupIndexCreate,
    onNewFieldsAddedToLookupIndex,
  };
};

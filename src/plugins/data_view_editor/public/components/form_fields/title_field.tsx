/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { MatchedItem } from '@kbn/data-views-plugin/public';
import {
  UseField,
  getFieldValidityAndErrorMessage,
  ValidationConfig,
  FieldConfig,
} from '../../shared_imports';
import { canAppendWildcard } from '../../lib';
import { schema } from '../form_schema';
import { RollupIndicesCapsResponse, IndexPatternConfig, MatchedIndicesSet } from '../../types';
import { matchedIndiciesDefault } from '../../data_view_editor_service';

interface TitleFieldProps {
  isRollup: boolean;
  matchedIndices$: Observable<MatchedIndicesSet>;
  rollupIndicesCapabilities: RollupIndicesCapsResponse;
  indexPatternValidationProvider: () => Promise<{
    matchedIndices: MatchedIndicesSet;
    rollupIndex: string | null | undefined;
  }>;
}

const rollupIndexPatternNoMatchError = {
  message: i18n.translate('indexPatternEditor.rollupDataView.createIndex.noMatchError', {
    defaultMessage: 'Rollup data view error: must match one rollup index',
  }),
};

const rollupIndexPatternTooManyMatchesError = {
  message: i18n.translate('indexPatternEditor.rollupDataView.createIndex.tooManyMatchesError', {
    defaultMessage: 'Rollup data view error: can only match one rollup index',
  }),
};

const mustMatchError = {
  message: i18n.translate('indexPatternEditor.createIndex.noMatch', {
    defaultMessage: 'Name must match one or more data streams, indices, or index aliases.',
  }),
};

interface MatchesValidatorArgs {
  rollupIndicesCapabilities: Record<string, { error: string }>;
  isRollup: boolean;
}

const createMatchesIndicesValidator = ({
  rollupIndicesCapabilities,
  isRollup,
}: MatchesValidatorArgs): ValidationConfig<{}, string, string> => ({
  validator: async ({ customData: { provider } }) => {
    const { matchedIndices, rollupIndex } = (await provider()) as {
      matchedIndices: MatchedIndicesSet;
      rollupIndex?: string;
    };

    // verifies that the title matches at least one index, alias, or data stream
    const rollupIndices = Object.keys(rollupIndicesCapabilities);

    if (matchedIndices.exactMatchedIndices.length === 0) {
      return mustMatchError;
    }

    if (!isRollup || !rollupIndices || !rollupIndices.length) {
      return;
    }

    // A rollup index pattern needs to match one and only one rollup index.
    const rollupIndexMatches = matchedIndices.exactMatchedIndices.filter((matchedIndex) =>
      rollupIndices.includes(matchedIndex.name)
    );

    if (!rollupIndexMatches.length) {
      return rollupIndexPatternNoMatchError;
    } else if (rollupIndexMatches.length > 1) {
      return rollupIndexPatternTooManyMatchesError;
    }

    // Error info is potentially provided via the rollup indices caps request
    const error = rollupIndex && rollupIndicesCapabilities[rollupIndex].error;

    if (error) {
      return {
        message: i18n.translate('indexPatternEditor.rollup.uncaughtError', {
          defaultMessage: 'Rollup data view error: {error}',
          values: {
            error,
          },
        }),
      };
    }
  },
});

interface GetTitleConfigArgs {
  isRollup: boolean;
  matchedIndices: MatchedItem[];
  rollupIndicesCapabilities: RollupIndicesCapsResponse;
}

const getTitleConfig = ({
  isRollup,
  rollupIndicesCapabilities,
}: GetTitleConfigArgs): FieldConfig<string> => {
  const titleFieldConfig = schema.title;

  const validations = [
    ...titleFieldConfig.validations,
    // note this is responsible for triggering the state update for the selected source list.
    createMatchesIndicesValidator({
      rollupIndicesCapabilities,
      isRollup,
    }),
  ];

  return {
    ...titleFieldConfig!,
    validations,
  };
};

export const TitleField = ({
  isRollup,
  matchedIndices$,
  rollupIndicesCapabilities,
  indexPatternValidationProvider,
}: TitleFieldProps) => {
  const [appendedWildcard, setAppendedWildcard] = useState<boolean>(false);
  const matchedIndices = useObservable(matchedIndices$, matchedIndiciesDefault).exactMatchedIndices;

  const fieldConfig = useMemo(
    () =>
      getTitleConfig({
        isRollup,
        matchedIndices,
        rollupIndicesCapabilities,
      }),
    [isRollup, matchedIndices, rollupIndicesCapabilities]
  );

  return (
    <UseField<string, IndexPatternConfig>
      path="title"
      config={fieldConfig}
      validationDataProvider={indexPatternValidationProvider}
      componentProps={{
        euiFieldProps: {
          'aria-label': i18n.translate('indexPatternEditor.form.titleAriaLabel', {
            defaultMessage: 'Index pattern field',
          }),
        },
      }}
    >
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow
            label={field.label}
            labelAppend={field.labelAppend}
            helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
            error={errorMessage}
            isInvalid={isInvalid}
            fullWidth
          >
            <EuiFieldText
              isInvalid={isInvalid}
              value={field.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                let query = e.target.value;
                if (query.length === 1 && !appendedWildcard && canAppendWildcard(query)) {
                  query += '*';
                  setAppendedWildcard(true);
                  setTimeout(() => e.target.setSelectionRange(1, 1));
                } else {
                  if (['', '*'].includes(query) && appendedWildcard) {
                    query = '';
                    setAppendedWildcard(false);
                  }
                }
                field.setValue(query);
              }}
              isLoading={field.isValidating}
              fullWidth
              data-test-subj="createIndexPatternTitleInput"
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

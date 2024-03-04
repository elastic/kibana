/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { EuiButton, EuiForm, EuiFormRow, EuiFieldText, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { SavedQuery, SavedQueryService } from '@kbn/data-plugin/public';

interface Props {
  savedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onSave: (savedQueryMeta: SavedQueryMeta) => void;
  onClose: () => void;
  showFilterOption: boolean | undefined;
  showTimeFilterOption: boolean | undefined;
}

export interface SavedQueryMeta {
  id?: string;
  title: string;
  description: string;
  shouldIncludeFilters: boolean;
  shouldIncludeTimefilter: boolean;
}

export function SaveQueryForm({
  savedQuery,
  savedQueryService,
  onSave,
  onClose,
  showFilterOption = true,
  showTimeFilterOption = true,
}: Props) {
  const [title, setTitle] = useState(savedQuery?.attributes.title ?? '');
  const [shouldIncludeFilters, setShouldIncludeFilters] = useState(
    Boolean(savedQuery ? savedQuery.attributes.filters : true)
  );
  // Defaults to false because saved queries are meant to be as portable as possible and loading
  // a saved query with a time filter will override whatever the current value of the global timepicker
  // is. We expect this option to be used rarely and only when the user knows they want this behavior.
  const [shouldIncludeTimefilter, setIncludeTimefilter] = useState(
    Boolean(savedQuery ? savedQuery.attributes.timefilter : false)
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saveIsDisabled, setSaveIsDisabled] = useState<boolean>(false);

  const titleConflictErrorText = i18n.translate(
    'unifiedSearch.search.searchBar.savedQueryForm.titleConflictText',
    {
      defaultMessage: 'Name conflicts with an existing query.',
    }
  );

  const titleExistsErrorText = i18n.translate(
    'unifiedSearch.search.searchBar.savedQueryForm.titleExistsText',
    {
      defaultMessage: 'Name is required.',
    }
  );

  const validate = useCallback(async () => {
    const errors = [];

    if (!title) {
      errors.push(titleExistsErrorText);
    }

    if (await savedQueryService.isDuplicateTitle(title, savedQuery?.id)) {
      errors.push(titleConflictErrorText);
    }

    if (!isEqual(errors, formErrors)) {
      setFormErrors(errors);
      return false;
    }

    return !formErrors.length;
  }, [
    formErrors,
    savedQuery,
    savedQueryService,
    title,
    titleConflictErrorText,
    titleExistsErrorText,
  ]);

  const onClickSave = useCallback(async () => {
    try {
      setSaveIsDisabled(true);

      if (await validate()) {
        onSave({
          id: savedQuery?.id,
          title,
          description: '',
          shouldIncludeFilters,
          shouldIncludeTimefilter,
        });
        onClose();
      }
    } finally {
      setSaveIsDisabled(false);
    }
  }, [
    validate,
    onSave,
    onClose,
    savedQuery?.id,
    title,
    shouldIncludeFilters,
    shouldIncludeTimefilter,
  ]);

  const onInputChange = useCallback((event) => {
    setFormErrors([]);
    setTitle(event.target.value);
  }, []);

  const autoTrim = useCallback(() => {
    const trimmedTitle = title.trim();
    if (title.length > trimmedTitle.length) {
      setTitle(trimmedTitle);
    }
  }, [title]);

  const hasErrors = formErrors.length > 0;

  const saveQueryForm = (
    <EuiForm isInvalid={hasErrors} error={formErrors} data-test-subj="saveQueryForm">
      <EuiFormRow
        label={i18n.translate('unifiedSearch.search.searchBar.savedQueryNameLabelText', {
          defaultMessage: 'Name',
        })}
        isInvalid={hasErrors}
        display="rowCompressed"
      >
        <EuiFieldText
          disabled={!!savedQuery}
          value={title}
          name="title"
          onChange={onInputChange}
          data-test-subj="saveQueryFormTitle"
          isInvalid={hasErrors}
          onBlur={autoTrim}
          compressed
        />
      </EuiFormRow>

      {showFilterOption && (
        <EuiFormRow display="rowCompressed">
          <EuiSwitch
            name="shouldIncludeFilters"
            label={i18n.translate(
              'unifiedSearch.search.searchBar.savedQueryIncludeFiltersLabelText',
              {
                defaultMessage: 'Include filters',
              }
            )}
            checked={shouldIncludeFilters}
            onChange={() => {
              setShouldIncludeFilters(!shouldIncludeFilters);
            }}
            data-test-subj="saveQueryFormIncludeFiltersOption"
          />
        </EuiFormRow>
      )}

      {showTimeFilterOption && (
        <EuiFormRow display="rowCompressed">
          <EuiSwitch
            name="shouldIncludeTimefilter"
            label={i18n.translate(
              'unifiedSearch.search.searchBar.savedQueryIncludeTimeFilterLabelText',
              {
                defaultMessage: 'Include time filter',
              }
            )}
            checked={shouldIncludeTimefilter}
            onChange={() => {
              setIncludeTimefilter(!shouldIncludeTimefilter);
            }}
            data-test-subj="saveQueryFormIncludeTimeFilterOption"
          />
        </EuiFormRow>
      )}

      <EuiFormRow>
        <EuiButton
          fullWidth
          size="s"
          onClick={onClickSave}
          fill
          data-test-subj="savedQueryFormSaveButton"
          disabled={hasErrors || saveIsDisabled}
        >
          {i18n.translate('unifiedSearch.search.searchBar.savedQueryFormSaveButtonText', {
            defaultMessage: 'Save query',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );

  return <>{saveQueryForm}</>;
}

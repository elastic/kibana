/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiOverlayMask,
  EuiModal,
  EuiButton,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { sortBy, isEqual } from 'lodash';
import { SavedQuery, SavedQueryAttributes, SavedQueryService } from '../..';

interface Props {
  savedQuery?: SavedQueryAttributes;
  savedQueryService: SavedQueryService;
  onSave: (savedQueryMeta: SavedQueryMeta) => void;
  onClose: () => void;
  showFilterOption: boolean | undefined;
  showTimeFilterOption: boolean | undefined;
}

export interface SavedQueryMeta {
  title: string;
  description: string;
  shouldIncludeFilters: boolean;
  shouldIncludeTimefilter: boolean;
}

export const SaveQueryForm: FunctionComponent<Props> = ({
  savedQuery,
  savedQueryService,
  onSave,
  onClose,
  showFilterOption = true,
  showTimeFilterOption = true,
}) => {
  const [title, setTitle] = useState(savedQuery ? savedQuery.title : '');
  const [description, setDescription] = useState(savedQuery ? savedQuery.description : '');
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [shouldIncludeFilters, setShouldIncludeFilters] = useState(
    savedQuery ? !!savedQuery.filters : true
  );
  // Defaults to false because saved queries are meant to be as portable as possible and loading
  // a saved query with a time filter will override whatever the current value of the global timepicker
  // is. We expect this option to be used rarely and only when the user knows they want this behavior.
  const [shouldIncludeTimefilter, setIncludeTimefilter] = useState(
    savedQuery ? !!savedQuery.timefilter : false
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchQueries = async () => {
      const allSavedQueries = await savedQueryService.getAllSavedQueries();
      const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title') as SavedQuery[];
      setSavedQueries(sortedAllSavedQueries);
    };
    fetchQueries();
  }, [savedQueryService]);

  const savedQueryDescriptionText = i18n.translate(
    'data.search.searchBar.savedQueryDescriptionText',
    {
      defaultMessage: 'Save query text and filters that you want to use again.',
    }
  );

  const titleConflictErrorText = i18n.translate(
    'data.search.searchBar.savedQueryForm.titleConflictText',
    {
      defaultMessage: 'Name conflicts with an existing saved query',
    }
  );
  const titleMissingErrorText = i18n.translate(
    'data.search.searchBar.savedQueryForm.titleMissingText',
    {
      defaultMessage: 'Name is required',
    }
  );
  const whitespaceErrorText = i18n.translate(
    'data.search.searchBar.savedQueryForm.whitespaceErrorText',
    {
      defaultMessage: 'Name cannot contain leading or trailing whitespace',
    }
  );

  const validate = () => {
    const errors = [];
    if (!title.length) {
      errors.push(titleMissingErrorText);
    }
    if (title.length > title.trim().length) {
      errors.push(whitespaceErrorText);
    }
    if (
      !!savedQueries.find(
        existingSavedQuery => !savedQuery && existingSavedQuery.attributes.title === title
      )
    ) {
      errors.push(titleConflictErrorText);
    }

    if (!isEqual(errors, formErrors)) {
      setFormErrors(errors);
    }
  };

  const hasErrors = formErrors.length > 0;

  if (hasErrors) {
    validate();
  }

  const saveQueryForm = (
    <EuiForm isInvalid={hasErrors} error={formErrors} data-test-subj="saveQueryForm">
      <EuiFormRow>
        <EuiText color="subdued">{savedQueryDescriptionText}</EuiText>
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('data.search.searchBar.savedQueryNameLabelText', {
          defaultMessage: 'Name',
        })}
        helpText={i18n.translate('data.search.searchBar.savedQueryNameHelpText', {
          defaultMessage:
            'Name is required. Name cannot contain leading or trailing whitespace. Name must be unique.',
        })}
        isInvalid={hasErrors}
      >
        <EuiFieldText
          disabled={!!savedQuery}
          value={title}
          name="title"
          onChange={event => {
            setTitle(event.target.value);
          }}
          data-test-subj="saveQueryFormTitle"
          isInvalid={hasErrors}
          onBlur={validate}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('data.search.searchBar.savedQueryDescriptionLabelText', {
          defaultMessage: 'Description',
        })}
      >
        <EuiFieldText
          value={description}
          name="description"
          onChange={event => {
            setDescription(event.target.value);
          }}
          data-test-subj="saveQueryFormDescription"
        />
      </EuiFormRow>
      {showFilterOption && (
        <EuiFormRow>
          <EuiSwitch
            name="shouldIncludeFilters"
            label={i18n.translate('data.search.searchBar.savedQueryIncludeFiltersLabelText', {
              defaultMessage: 'Include filters',
            })}
            checked={shouldIncludeFilters}
            onChange={() => {
              setShouldIncludeFilters(!shouldIncludeFilters);
            }}
            data-test-subj="saveQueryFormIncludeFiltersOption"
          />
        </EuiFormRow>
      )}

      {showTimeFilterOption && (
        <EuiFormRow>
          <EuiSwitch
            name="shouldIncludeTimefilter"
            label={i18n.translate('data.search.searchBar.savedQueryIncludeTimeFilterLabelText', {
              defaultMessage: 'Include time filter',
            })}
            checked={shouldIncludeTimefilter}
            onChange={() => {
              setIncludeTimefilter(!shouldIncludeTimefilter);
            }}
            data-test-subj="saveQueryFormIncludeTimeFilterOption"
          />
        </EuiFormRow>
      )}
    </EuiForm>
  );

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} initialFocus="[name=title]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.translate('data.search.searchBar.savedQueryFormTitle', {
              defaultMessage: 'Save query',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{saveQueryForm}</EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose} data-test-subj="savedQueryFormCancelButton">
            {i18n.translate('data.search.searchBar.savedQueryFormCancelButtonText', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>

          <EuiButton
            onClick={() =>
              onSave({
                title,
                description,
                shouldIncludeFilters,
                shouldIncludeTimefilter,
              })
            }
            fill
            data-test-subj="savedQueryFormSaveButton"
            disabled={hasErrors}
          >
            {i18n.translate('data.search.searchBar.savedQueryFormSaveButtonText', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

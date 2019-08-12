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

import React, { FunctionComponent, useState } from 'react';
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
import { SavedQueryAttributes } from '../index';

interface Props {
  savedQuery?: SavedQueryAttributes;
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
  onSave,
  onClose,
  showFilterOption,
  showTimeFilterOption,
}) => {
  const [title, setTitle] = useState(savedQuery ? savedQuery.title : '');
  const [description, setDescription] = useState(savedQuery ? savedQuery.description : '');
  const [shouldIncludeFilters, setShouldIncludeFilters] = useState(
    savedQuery ? !!savedQuery.filters : true
  );
  const [shouldIncludeTimefilter, setIncludeTimefilter] = useState(
    savedQuery ? !!savedQuery.timefilter : false
  );
  const savedQueryDescriptionText = i18n.translate(
    'data.search.searchBar.savedQueryDescriptionText',
    {
      defaultMessage:
        'Saved queries allow you to save common search snippets and filters for later use.',
    }
  );

  const saveQueryForm = (
    <EuiForm>
      <EuiFormRow>
        <EuiText color="subdued">{savedQueryDescriptionText}</EuiText>
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('data.search.searchBar.savedQueryNameLabelText', {
          defaultMessage: 'Name',
        })}
        helpText={i18n.translate('data.search.searchBar.savedQueryNameHelpText', {
          defaultMessage: 'Must be unique.',
        })}
      >
        <EuiFieldText
          disabled={!!savedQuery}
          value={title}
          name="title"
          onChange={event => {
            setTitle(event.target.value);
          }}
          data-test-subj="saveQueryFormTitle"
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
      {!!showFilterOption && (
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

      {!!showTimeFilterOption && (
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
          <EuiButtonEmpty onClick={onClose}>
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

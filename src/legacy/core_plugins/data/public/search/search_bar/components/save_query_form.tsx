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
} from '@elastic/eui';
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
    !!(savedQuery && savedQuery.filters)
  );
  const [shouldIncludeTimefilter, setIncludeTimefilter] = useState(
    !!(savedQuery && savedQuery.timefilter)
  );

  const saveQueryForm = (
    <EuiForm>
      <EuiFormRow label="Name">
        <EuiFieldText
          value={title}
          name="title"
          onChange={event => {
            setTitle(event.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow label="Description">
        <EuiFieldText
          value={description}
          name="description"
          onChange={event => {
            setDescription(event.target.value);
          }}
        />
      </EuiFormRow>
      {!!showFilterOption && (
        <EuiFormRow>
          <EuiSwitch
            name="shouldIncludeFilters"
            label="Include filters"
            checked={shouldIncludeFilters}
            onChange={() => {
              setShouldIncludeFilters(!shouldIncludeFilters);
            }}
          />
        </EuiFormRow>
      )}

      {!!showTimeFilterOption && (
        <EuiFormRow>
          <EuiSwitch
            name="shouldIncludeTimefilter"
            label="Include time filter"
            checked={shouldIncludeTimefilter}
            onChange={() => {
              setIncludeTimefilter(!shouldIncludeTimefilter);
            }}
          />
        </EuiFormRow>
      )}
    </EuiForm>
  );

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>Save query</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{saveQueryForm}</EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>

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
          >
            Save
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

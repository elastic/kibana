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

interface Props {
  onSave: (savedQueryMeta: SavedQueryMeta) => void;
  onClose: () => void;
}

export interface SavedQueryMeta {
  title: string;
  description: string;
  shouldIncludeFilters: boolean;
  shouldIncludeTimefilter: boolean;
}

export const SaveQueryForm: FunctionComponent<Props> = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shouldIncludeFilters, setShouldIncludeFilters] = useState(false);
  const [shouldIncludeTimefilter, setIncludeTimefilter] = useState(false);

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

      <EuiFormRow>
        <EuiSwitch
          name="shouldIncludeFilters"
          label="Include filters"
          checked={shouldIncludeTimefilter}
          onChange={() => {
            setIncludeTimefilter(!shouldIncludeTimefilter);
          }}
        />
      </EuiFormRow>
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

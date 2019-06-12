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

import React, { FunctionComponent, Fragment, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
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
import { SavedQuery } from '../../../search/search_bar';
import { Query } from '../index';

interface Props {
  query: Query;
  savedQuery?: SavedQuery;
  onSave: (savedQueryDetails: SavedQueryDetails) => void;
}

export interface SavedQueryDetails {
  title: string;
  description: string;
  includeFilters: boolean;
  includeTimeFilter: boolean;
  query: Query;
}

export const SavedQueryRow: FunctionComponent<Props> = ({ query, savedQuery, onSave }) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [includeFilters, setIncludeFilters] = useState(false);
  const [includeTimeFilter, setIncludeTimeFilter] = useState(false);

  const closeModal = () => setShowModal(false);
  const onClickSave = () => {
    onSave({
      title,
      description,
      includeFilters,
      includeTimeFilter,
      query,
    });
  };

  let rowContent;
  if (savedQuery) {
    rowContent = <EuiFlexItem grow={false}>{savedQuery.title}</EuiFlexItem>;
  } else if (query.query.length !== 0) {
    rowContent = (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={() => setShowModal(true)}>
          Save this query for reuse
        </EuiButtonEmpty>
      </EuiFlexItem>
    );
  } else {
    rowContent = 'Manage saved queries';
  }

  const saveQueryForm = (
    <EuiForm>
      <EuiFormRow label="Name">
        <EuiFieldText
          name="title"
          onChange={event => {
            setTitle(event.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow label="Description">
        <EuiFieldText
          name="description"
          onChange={event => {
            setDescription(event.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          name="includeFilters"
          label="Include filters"
          checked={includeFilters}
          onChange={() => {
            setIncludeFilters(!includeFilters);
          }}
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          name="includeFilters"
          label="Include filters"
          checked={includeTimeFilter}
          onChange={() => {
            setIncludeTimeFilter(!includeTimeFilter);
          }}
        />
      </EuiFormRow>
    </EuiForm>
  );

  let modal;
  if (showModal) {
    modal = (
      <EuiOverlayMask>
        <EuiModal onClose={closeModal} initialFocus="[name=popswitch]">
          <EuiModalHeader>
            <EuiModalHeaderTitle>Save query</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>{saveQueryForm}</EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>

            <EuiButton onClick={onClickSave} fill>
              Save
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup>{rowContent}</EuiFlexGroup>
      {modal}
    </Fragment>
  );
};

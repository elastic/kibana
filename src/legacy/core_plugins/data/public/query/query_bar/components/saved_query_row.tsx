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

import React, { FunctionComponent, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import chrome from 'ui/chrome';
import { SavedQueryAttributes } from '../../../search/search_bar';
import { Query } from '../index';

interface Props {
  query: Query;
  savedQuery?: SavedQueryAttributes;
  onSave: () => void;
  onSaveNew: () => void;
  isDirty: boolean;
}

export interface SavedQueryDetails {
  title: string;
  description: string;
  includeFilters: boolean;
  includeTimeFilter: boolean;
  query: Query;
}

export const SavedQueryRow: FunctionComponent<Props> = ({
  query,
  savedQuery,
  onSave,
  onSaveNew,
  isDirty,
}) => {
  let rowContent;
  if (savedQuery) {
    if (isDirty) {
      rowContent = (
        <Fragment>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onSave}>
              Save changes to query: {savedQuery.title}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onSaveNew}>Save as new</EuiButtonEmpty>
          </EuiFlexItem>
        </Fragment>
      );
    } else {
      rowContent = (
        <Fragment>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={''} color="text">
              {savedQuery.title}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onSaveNew}>Save as new</EuiButtonEmpty>
          </EuiFlexItem>
        </Fragment>
      );
    }
  } else if (query.query.length !== 0) {
    rowContent = (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onSave}>Save this query for reuse</EuiButtonEmpty>
      </EuiFlexItem>
    );
  } else {
    rowContent = (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          href={chrome.addBasePath(`/app/kibana#/management/kibana/objects?type=query`)}
        >
          Manage Saved Queries
        </EuiButtonEmpty>
      </EuiFlexItem>
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">{rowContent}</EuiFlexGroup>
    </Fragment>
  );
};

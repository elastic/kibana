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
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { SavedQuery } from '../../../search/search_bar';
import { Query } from '../index';

interface Props {
  query: Query;
  savedQuery?: SavedQuery;
  onSave: () => void;
}

export interface SavedQueryDetails {
  title: string;
  description: string;
  includeFilters: boolean;
  includeTimeFilter: boolean;
  query: Query;
}

export const SavedQueryRow: FunctionComponent<Props> = ({ query, savedQuery, onSave }) => {
  let rowContent;
  if (savedQuery) {
    rowContent = <EuiFlexItem grow={false}>{savedQuery.title}</EuiFlexItem>;
  } else if (query.query.length !== 0) {
    rowContent = (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onSave}>Save this query for reuse</EuiButtonEmpty>
      </EuiFlexItem>
    );
  } else {
    rowContent = (
      <EuiFlexItem>
        <EuiLink href={`#/management/kibana/objects`}>Manage Saved Queries</EuiLink>
      </EuiFlexItem>
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup>{rowContent}</EuiFlexGroup>
    </Fragment>
  );
};

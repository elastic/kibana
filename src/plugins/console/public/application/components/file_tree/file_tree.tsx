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
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FileTreeEntry, Props as FileEntryProps } from './file_tree_entry';
import { FileActionsBar } from './file_actions_bar';
import { FileSearchBar } from './file_search_bar';

export interface Props {
  entries: FileEntryProps[];
  onCreate: (fileName: string) => void;
  onSearchFilter: (search: string | undefined) => void;
  searchFilter?: string;
  disabled?: boolean;
}

export const FileTree: FunctionComponent<Props> = ({
  entries,
  onSearchFilter,
  disabled,
  searchFilter,
  onCreate,
}) => {
  const [showFileSearchBar, setShowFileSearchBar] = useState(false);

  return (
    <div className="conApp__fileTree">
      <EuiFlexGroup
        className="conApp__fileTree__entryContainer"
        gutterSize="none"
        responsive={false}
        direction="column"
      >
        {/* File Action Bar */}
        <EuiFlexItem grow={false}>
          <FileActionsBar
            disabled={disabled}
            onCreate={onCreate}
            onFilter={() => {
              if (showFileSearchBar) {
                onSearchFilter(undefined);
              }
              setShowFileSearchBar(!showFileSearchBar);
            }}
          />
        </EuiFlexItem>
        {/* File Search Bar */}
        {showFileSearchBar && (
          <EuiFlexItem grow={false}>
            <FileSearchBar
              onChange={(searchTerm: string) => {
                onSearchFilter(searchTerm);
              }}
              searchValue={searchFilter ?? ''}
            />
          </EuiFlexItem>
        )}

        {entries.map((props, idx) => (
          <EuiFlexItem key={idx} grow={false}>
            <FileTreeEntry
              {...props}
              canDelete={props.canDelete && !disabled}
              canEdit={props.canEdit && !disabled}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};

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

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FileTreeEntry, EditHandlerArg } from './file_tree_entry';

export interface Entries {
  name: string;
  id: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (arg: EditHandlerArg) => void;
  className?: string;
  canDelete?: boolean;
  canEdit?: boolean;
}

export interface Props {
  entries: Entries[];
  editingDisabled?: boolean;
}

export const FileTree: FunctionComponent<Props> = ({ entries, editingDisabled }) => {
  return (
    <EuiFlexGroup
      className="conApp__fileTree__entryContainer"
      gutterSize="none"
      responsive={false}
      direction="column"
    >
      {entries.map(
        ({ name, id, className, canDelete, onDelete, onSelect, onEdit, canEdit }, idx) => (
          <EuiFlexItem key={idx} grow={false}>
            <FileTreeEntry
              id={id}
              canDelete={canDelete && !editingDisabled}
              canEdit={canEdit && !editingDisabled}
              name={name}
              className={className}
              onDelete={onDelete}
              onSelect={onSelect}
              onEdit={onEdit}
            />
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
};

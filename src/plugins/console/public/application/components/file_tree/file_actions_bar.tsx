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
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiText } from '@elastic/eui';

import { FileForm } from './forms';
import { TextObjectWithId } from '../../../../common/text_object';

export interface Props {
  currentTextObject: TextObjectWithId;
  onCreate: (filename: string) => void;
  canDelete: boolean;
  onDelete: (textObject: TextObjectWithId) => void;
  onEdit: () => void;
  disabled?: boolean;
}

export const FileActionsBar: FunctionComponent<Props> = ({
  currentTextObject,
  onCreate,
  canDelete,
  onDelete,
  onEdit,
  disabled,
}) => {
  const [showCreateFilePopover, setShowCreateFilePopover] = useState(false);

  return (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      gutterSize="none"
      className="conApp__fileTree__actionBar"
    >
      <EuiFlexItem>
        <EuiText size="s">Files</EuiText>
      </EuiFlexItem>
      {canDelete && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            disabled={disabled}
            onClick={() => onDelete(currentTextObject)}
            aria-label="delete a file"
            color="ghost"
            iconType="trash"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={showCreateFilePopover && !disabled}
          closePopover={() => setShowCreateFilePopover(false)}
          button={
            <EuiButtonIcon
              disabled={disabled}
              onClick={() => setShowCreateFilePopover(true)}
              color="ghost"
              aria-label="create a new file"
              iconType="plusInCircle"
            />
          }
        >
          <FileForm
            isSubmitting={Boolean(disabled)}
            onSubmit={(fileName: string) => {
              onCreate(fileName);
              setShowCreateFilePopover(false);
            }}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

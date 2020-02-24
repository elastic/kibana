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

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonIcon, EuiFieldText } from '@elastic/eui';

export interface EditHandlerArg {
  id: string;
  name: string;
}

export interface Props {
  id: string;
  name: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (props: EditHandlerArg) => void;
  className?: string;
  canDelete?: boolean;
  canEdit?: boolean;
}

export const FileTreeEntry: FunctionComponent<Props> = ({
  name,
  className,
  onSelect,
  canDelete,
  onDelete,
  canEdit,
  onEdit,
  id,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState<undefined | string>(undefined);

  const renderInputField = () => (
    <EuiFlexItem>
      <EuiFieldText
        className="conApp__fileTree__entry__nameInput"
        inputRef={(ref: HTMLInputElement) => ref?.focus()}
        compressed
        onBlur={() => {
          // Don't allow empty names to be saved
          if (nameValue && onEdit) {
            onEdit({ name: nameValue, id });
          }
          setNameValue(undefined);
          setIsEditing(false);
        }}
        onChange={event => {
          setNameValue(event.target.value);
        }}
        value={nameValue}
      />
    </EuiFlexItem>
  );

  const renderEntry = () => (
    <EuiFlexItem>
      <EuiText
        aria-label={i18n.translate('console.fileTree.fileEntryName', {
          defaultMessage: '{name}',
          values: { name },
        })}
        size="s"
      >
        <span
          tabIndex={0}
          onFocus={event => {
            if (canEdit) {
              event.stopPropagation();
              setIsEditing(true);
              setNameValue(name);
            }
          }}
        >
          {name}
        </span>
      </EuiText>
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      gutterSize="none"
      className={className}
      onClick={() => onSelect(id)}
    >
      {isEditing ? renderInputField() : renderEntry()}
      {canDelete && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            tabIndex={0}
            aria-label={i18n.translate('console.fileTree.deleteButtonLabel', {
              defaultMessage: 'Delete {name}',
              values: { name },
            })}
            className="conApp__fileTree__entry__deleteActionButton"
            onClick={() => onDelete(id)}
            color="danger"
            iconType="trash"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

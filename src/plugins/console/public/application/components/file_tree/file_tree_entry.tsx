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

import { FileSaveErrorIcon } from './icons_and_copy';

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
  displayName?: React.ReactNode;
  ariaLabel?: string;
  error?: string;
}

export const FileTreeEntry: FunctionComponent<Props> = ({
  name,
  displayName,
  className,
  onSelect,
  canDelete,
  onDelete,
  canEdit,
  onEdit,
  id,
  ariaLabel,
  error,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState<undefined | string>(undefined);

  const renderInputField = () => {
    const handleSubmit = () => {
      // Don't allow empty names to be saved and don't
      // save the same name again...
      if (nameValue && nameValue !== name && onEdit) {
        onEdit({ name: nameValue, id });
      }
      setNameValue(undefined);
      setIsEditing(false);
    };
    return (
      <EuiFlexItem>
        <EuiFieldText
          className="conApp__fileTree__entry__nameInput"
          inputRef={(ref: HTMLInputElement) => ref?.focus()}
          compressed
          onBlur={() => {
            handleSubmit();
          }}
          onChange={event => {
            setNameValue(event.target.value);
          }}
          value={nameValue}
        />
      </EuiFlexItem>
    );
  };

  const renderEntry = () => (
    <EuiFlexItem>
      <EuiText
        className="conApp__fileTree__entry__fileName"
        aria-label={i18n.translate('console.fileTree.fileEntryName', {
          defaultMessage: '{ariaLabel}',
          values: { ariaLabel: ariaLabel ?? name },
        })}
        size="s"
      >
        <span
          data-test-subj={`consoleFileNameLabel-${name}`}
          tabIndex={0}
          onKeyDown={event => {
            if (event.keyCode === 13 /* Enter */) {
              event.preventDefault();
              onSelect(id);
            }
          }}
        >
          {error && (
            <span
              data-test-subj={`consoleFileSaveErrorIcon-${name}`}
              className="conApp__fileTree__errorIconContainer"
            >
              <FileSaveErrorIcon errorMessage={error} />
            </span>
          )}
          {displayName ?? name}
        </span>
      </EuiText>
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      gutterSize="none"
      className={'conApp__fileTree__entry ' + className}
      onClick={() => onSelect(id)}
    >
      {isEditing ? renderInputField() : renderEntry()}
      {/* File Actions */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          {canEdit && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`consoleEditFileButton-${name}`}
                tabIndex={0}
                aria-label={i18n.translate('console.fileTree.editButtonLabel', {
                  defaultMessage: 'Edit {ariaLabel}',
                  values: { ariaLabel: ariaLabel ?? name },
                })}
                className="conApp__fileTree__entry__actionButton"
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsEditing(true);
                  setNameValue(name);
                }}
                color="primary"
                iconType="pencil"
              />
            </EuiFlexItem>
          )}
          {canDelete && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`consoleDeleteFileButton-${name}`}
                tabIndex={0}
                aria-label={i18n.translate('console.fileTree.deleteButtonLabel', {
                  defaultMessage: 'Delete {name}',
                  values: { name },
                })}
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete(id);
                }}
                className="conApp__fileTree__entry__actionButton"
                color="danger"
                iconType="trash"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

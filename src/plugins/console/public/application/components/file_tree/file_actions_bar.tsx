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
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';

import { FileForm } from './forms';

export interface Props {
  onCreate: (fileName: string) => void;
  onFilter: () => void;
  disabled?: boolean;
  fileActionInProgress?: boolean;
}

export const FileActionsBar: FunctionComponent<Props> = ({
  onCreate,
  onFilter,
  disabled,
  fileActionInProgress,
}) => {
  const [showCreateFilePopover, setShowCreateFilePopover] = useState(false);

  return (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      gutterSize="none"
      className="conApp__fileTree__actionBar"
    >
      <EuiFlexItem />
      {fileActionInProgress && (
        <EuiFlexItem className="conApp__fileTree__spinner" grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          disabled={disabled}
          size="s"
          onClick={() => {
            setShowCreateFilePopover(false);
            onFilter();
          }}
          color="text"
          aria-label={i18n.translate('console.fileTree.forms.createSearchToggleAriaLabel', {
            defaultMessage: 'Toggle file filter',
          })}
          iconType="search"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          ownFocus
          initialFocus={() => document.querySelector('.conAppFileNameTextField')! as HTMLElement}
          isOpen={showCreateFilePopover && !disabled}
          closePopover={() => setShowCreateFilePopover(false)}
          button={
            <EuiButtonIcon
              size="s"
              disabled={disabled}
              onClick={() => {
                setShowCreateFilePopover(true);
              }}
              color="text"
              aria-label={i18n.translate('console.fileTree.forms.createButtonAriaLabel', {
                defaultMessage: 'Create a file',
              })}
              iconType="plusInCircle"
              data-test-subj="consoleCreateFileButton"
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

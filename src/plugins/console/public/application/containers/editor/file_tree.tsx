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

import React, { useState, FunctionComponent } from 'react';
import classNames from 'classnames';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTreeView,
  EuiText,
  EuiButtonIcon,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';

import { useEditorReadContext, useEditorActionContext } from '../../contexts';
import { useCreateTextObject } from '../../hooks';
import { FileForm } from '../../components';

export const FileTree: FunctionComponent = () => {
  const [showCreateFilePopover, setShowCreateFilePopover] = useState(false);
  const [isCreatingOrUpdatingFile, setIsCreatingOrUpdatingFile] = useState(false);
  const { textObjects, currentTextObjectId } = useEditorReadContext();
  const dispatch = useEditorActionContext();
  const createTextObject = useCreateTextObject();

  return (
    <EuiFlexGroup
      className="conApp__fileTree"
      direction="column"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          gutterSize="none"
          className="conApp__fileTree__actionBar"
        >
          <EuiFlexItem>
            <EuiText size="s">Actions</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              isOpen={showCreateFilePopover}
              closePopover={() => setShowCreateFilePopover(false)}
              button={
                <EuiButtonIcon
                  onClick={() => setShowCreateFilePopover(true)}
                  color="ghost"
                  aria-label="create a new file"
                  iconType="plusInCircle"
                />
              }
            >
              <FileForm
                isSubmitting={isCreatingOrUpdatingFile}
                onSubmit={(fileName: string) => {
                  setIsCreatingOrUpdatingFile(true);
                  createTextObject({
                    textObject: {
                      text: '',
                      updatedAt: Date.now(),
                      createdAt: Date.now(),
                      name: fileName,
                    },
                  })
                    .then(() => {
                      setShowCreateFilePopover(false);
                    })
                    .finally(() => setIsCreatingOrUpdatingFile(false));
                }}
              />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTreeView
          aria-label="File tree view"
          display="compressed"
          items={Object.values(textObjects)
            .sort((a, b) => (a.isScratchPad ? 1 : a.createdAt - b.createdAt))
            .map(({ isScratchPad, name, id }, idx) => {
              return {
                id,
                className: classNames({
                  conApp__fileTree__scratchPadEntry: isScratchPad,
                  conApp__fileTree__entry: true,
                  'conApp__fileTree__entry--selected': id === currentTextObjectId,
                }),
                label: isScratchPad ? 'Scratch Pad' : name ?? `Untitled ${idx + 1}`,
                icon: isScratchPad ? <EuiIcon size="s" type="pencil" /> : undefined,
                useEmptyIcon: !isScratchPad,
                callback: () => {
                  dispatch({
                    type: 'textObject.setCurrent',
                    payload: id,
                  });
                  return '';
                },
              };
            })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
import React, { useState } from 'react';
import { EuiModalBody } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { EuiModalFooter } from '@elastic/eui';
import { TodoSavedObjectAttributes } from 'examples/embeddable_examples/common';
import { EuiModalHeader } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';

export function CreateEditTodoComponent({
  savedObjectId,
  attributes,
  onSave,
}: {
  savedObjectId?: string;
  attributes?: TodoSavedObjectAttributes;
  onSave: (attributes: TodoSavedObjectAttributes, saveToLibrary: boolean) => void;
}) {
  const [task, setTask] = useState(attributes?.task);
  const [title, setTitle] = useState(attributes?.title);
  return (
    <EuiModalBody>
      <EuiModalHeader>
        <h1>{`${savedObjectId ? 'Create new ' : 'Edit '} todo item`}</h1>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow label="Title">
          <EuiFieldText
            data-test-subj="titleInputField"
            value={title}
            placeholder="Enter title here"
            onChange={e => setTitle(e.target.value)}
          />
        </EuiFormRow>

        <EuiFormRow label="Task">
          <EuiFieldText
            data-test-subj="taskInputField"
            value={task}
            placeholder="Enter task here"
            onChange={e => setTask(e.target.value)}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        {savedObjectId === undefined ? (
          <EuiButton
            data-test-subj="createTodoEmbeddable"
            disabled={task === undefined}
            onClick={() => onSave({ task: task!, title }, false)}
          >
            Save
          </EuiButton>
        ) : null}
        <EuiButton
          data-test-subj="createTodoEmbeddable"
          disabled={task === undefined}
          onClick={() => onSave({ task: task!, title }, true)}
        >
          {savedObjectId ? 'Update library item' : 'Save to library'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModalBody>
  );
}

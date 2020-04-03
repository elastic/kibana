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
import { EuiModalHeader } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { NoteSavedObjectAttributes } from '../common';

export function CreateEditNoteComponent({
  savedObjectId,
  attributes,
  onSave,
}: {
  savedObjectId?: string;
  attributes?: NoteSavedObjectAttributes;
  onSave: (attributes: NoteSavedObjectAttributes, saveToLibrary: boolean) => void;
}) {
  const [to, setTo] = useState(attributes?.to ?? '');
  const [from, setFrom] = useState(attributes?.from ?? '');
  const [message, setMessage] = useState(attributes?.message ?? '');
  return (
    <EuiModalBody>
      <EuiModalHeader>
        <h1>{`${savedObjectId ? 'Create new ' : 'Edit '}`}</h1>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow label="To">
          <EuiFieldText
            data-test-subj="toInputField"
            value={to}
            placeholder="To"
            onChange={e => setTo(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow label="From">
          <EuiFieldText
            data-test-subj="fromInputField"
            value={from}
            placeholder="From"
            onChange={e => setFrom(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow label="Message">
          <EuiFieldText
            data-test-subj="messageInputField"
            value={message}
            placeholder="Message"
            onChange={e => setMessage(e.target.value)}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        {savedObjectId === undefined ? (
          <EuiButton
            data-test-subj="saveNoteEmbeddableByValue"
            disabled={message === ''}
            onClick={() => onSave({ message, to, from }, false)}
          >
            Save
          </EuiButton>
        ) : null}
        <EuiButton
          data-test-subj="saveNoteEmbeddableByRef"
          disabled={message === ''}
          onClick={() => onSave({ message, to, from }, true)}
        >
          {savedObjectId ? 'Update library item' : 'Save to library'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModalBody>
  );
}

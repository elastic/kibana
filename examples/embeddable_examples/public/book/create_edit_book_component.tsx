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
import { EuiModalBody, EuiCheckbox } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { EuiModalFooter } from '@elastic/eui';
import { EuiModalHeader } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { BookSavedObjectAttributes } from '../../common';

export function CreateEditBookComponent({
  savedObjectId,
  attributes,
  onSave,
}: {
  savedObjectId?: string;
  attributes?: BookSavedObjectAttributes;
  onSave: (attributes: BookSavedObjectAttributes, useRefType: boolean) => void;
}) {
  const [title, setTitle] = useState(attributes?.title ?? '');
  const [author, setAuthor] = useState(attributes?.author ?? '');
  const [readIt, setReadIt] = useState(attributes?.readIt ?? false);
  return (
    <EuiModalBody>
      <EuiModalHeader>
        <h1>{`${savedObjectId ? 'Create new ' : 'Edit '}`}</h1>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow label="Title">
          <EuiFieldText
            data-test-subj="titleInputField"
            value={title}
            placeholder="Title"
            onChange={(e) => setTitle(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow label="Author">
          <EuiFieldText
            data-test-subj="authorInputField"
            value={author}
            placeholder="Author"
            onChange={(e) => setAuthor(e.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow label="Read It">
          <EuiCheckbox
            id="ReadIt"
            checked={readIt}
            onChange={(event) => setReadIt(event.target.checked)}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          data-test-subj="saveBookEmbeddableByValue"
          disabled={title === ''}
          onClick={() => onSave({ title, author, readIt }, false)}
        >
          {savedObjectId ? 'Unlink from library item' : 'Save and Return'}
        </EuiButton>
        <EuiButton
          data-test-subj="saveBookEmbeddableByRef"
          disabled={title === ''}
          onClick={() => onSave({ title, author, readIt }, true)}
        >
          {savedObjectId ? 'Update library item' : 'Save to library'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModalBody>
  );
}

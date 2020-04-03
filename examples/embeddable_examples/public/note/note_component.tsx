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
import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { EuiText } from '@elastic/eui';
import { EuiFlexGrid } from '@elastic/eui';
import {
  withEmbeddableSubscription,
  EmbeddableOutput,
} from '../../../../src/plugins/embeddable/public';
import { NoteEmbeddable, NoteEmbeddableInput, NoteEmbeddableOutput } from './note_embeddable';

interface Props {
  embeddable: NoteEmbeddable;
  input: NoteEmbeddableInput;
  output: EmbeddableOutput;
}

function wrapSearchTerms(task?: string, search?: string) {
  if (!search || !task) return task;
  const parts = task.split(new RegExp(`(${search})`, 'g'));
  return parts.map((part, i) =>
    part === search ? (
      <span key={i} style={{ backgroundColor: 'yellow' }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function NoteEmbeddableComponentInner({ input: { search }, embeddable }: Props) {
  const from = embeddable.getFrom();
  const to = embeddable.getTo();
  const message = embeddable.getMessage();
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>
        <EuiFlexGrid columns={1} gutterSize="none">
          {to ? (
            <EuiFlexItem>
              <EuiText data-test-subj="noteEmbeddableTo">
                <h3>{`${wrapSearchTerms(to, search)},`}</h3>
              </EuiText>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiText data-test-subj="noteEmbeddableMessage">
              {wrapSearchTerms(message ?? '', search)}
            </EuiText>
          </EuiFlexItem>
          {from ? (
            <EuiFlexItem>
              <EuiText data-test-subj="noteEmbeddableFrom">
                <h3>{`- ${wrapSearchTerms(from, search)}`}</h3>
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const NoteEmbeddableComponent = withEmbeddableSubscription<
  NoteEmbeddableInput,
  NoteEmbeddableOutput,
  NoteEmbeddable,
  {}
>(NoteEmbeddableComponentInner);

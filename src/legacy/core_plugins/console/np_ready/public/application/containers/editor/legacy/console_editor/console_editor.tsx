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

import { MemoReadOnlyEditor } from './readonly_editor';
import { MemoEditor, EditorProps } from './editor';

export type ConsoleEditorProps = { readOnly?: boolean } & EditorProps;

export function ConsoleEditor(props: ConsoleEditorProps) {
  const { readOnly, ...editorProps } = props;
  if (props.readOnly) {
    return <MemoReadOnlyEditor onEditorReady={editorProps.onEditorReady} />;
  }
  return <MemoEditor {...editorProps} />;
}

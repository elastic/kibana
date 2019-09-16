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
import React, { useEffect, useRef } from 'react';
import $ from 'jquery';

// @ts-ignore
import { initializeOutput } from '../../../../../../../public/quarantined/src/output';
import { useAppContext } from '../../../../context';

export interface EditorOutputProps {
  onReady?: (ref: any) => void;
}

function Component({ onReady }: EditorOutputProps) {
  const editorRef = useRef<null | HTMLDivElement>(null);
  const {
    services: { settings },
  } = useAppContext();

  useEffect(() => {
    const editor$ = $(editorRef.current!);
    const outputEditor = initializeOutput(editor$, settings);
    if (onReady) {
      onReady({ editor: outputEditor, element: editorRef.current! });
    }
  });

  return (
    <div ref={editorRef} className="conApp__output" data-test-subj="response-editor">
      <div className="conApp__outputContent" id="ConAppOutput" />
    </div>
  );
}

export const EditorOutput = React.memo(Component);

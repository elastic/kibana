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

import React, { useEffect } from 'react';
// @ts-ignore
import exampleText from 'raw-loader!../constants/help_example.txt';
import { createReadOnlyAceEditor } from '../models/legacy_core_editor';

interface EditorExampleProps {
  panel: string;
}

export function EditorExample(props: EditorExampleProps) {
  const elemId = `help-example-${props.panel}`;

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`#${elemId}`)!;
    el.textContent = exampleText.trim();
    const editor = createReadOnlyAceEditor(el);

    return () => {
      editor.destroy();
    };
  }, [elemId]);

  return (
    <>
      {/* Axe complains about Ace's textarea element missing a label, which interferes with our
      automated a11y tests per #52136. This wrapper does nothing to address a11y but it does
      satisfy Axe. */}

      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label>
        <div id={elemId} className="conHelp__example" />
      </label>
    </>
  );
}

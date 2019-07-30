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

import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { Language } from '../language';
import { ThemeMode } from '../../../types';
import { getThemeConfig } from '../monaco';
import * as editor from '../index';

interface Props {
  options?: monaco.editor.IEditorConstructionOptions;
  themeMode: ThemeMode;
  language: Language;
  workerSrc: string;
  completionItemProviderFactory: (worker: any) => monaco.languages.CompletionItemProvider;
  value?: string;
}

export function Editor(props: Props) {
  const { themeMode, language, value, options, workerSrc, completionItemProviderFactory } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    monaco.editor.defineTheme('euiColors', getThemeConfig(themeMode));
  }, [themeMode]);

  useEffect(() => {
    editor.setup();
    editor.registerLanguage(language, workerSrc, completionItemProviderFactory);

    setEditor(
      monaco.editor.create(ref.current!, {
        language: language.id,
        value,
        ...options,
      })
    );
  }, []);

  return (
    <div style={{ height: '100%' }}>
      <style>
        {`
  /*
    This is a hack for now to get around the style set up by the code x-pack plugin :c
  */
  .monaco-editor .cursors-layer > .cursor {
    display: inherit !important;
  }

  textarea.inputarea {
    display: inherit !important;
  }


  .code-line-decoration + .cldr.folding {
    left: inherit !important;
  }

        `}
      </style>
      <div style={{ height: '100%' }} ref={ref} />
    </div>
  );
}

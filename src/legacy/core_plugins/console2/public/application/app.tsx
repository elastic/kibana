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

import { Editor } from './editor';
import { useAppContext } from './context';
import { konsole } from './konsole_lang';

export const App = () => {
  const [ctx] = useAppContext();
  const { themeMode } = ctx;

  return (
    <Editor
      value={`POST /_rollup/job/t/_start`}
      language={konsole}
      themeMode={themeMode}
      options={{
        hover: { enabled: true },
        tabCompletion: true,
        readOnly: false,
        minimap: { enabled: false },
        quickSuggestions: true,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'hidden',
        },
      }}
    />
  );
};

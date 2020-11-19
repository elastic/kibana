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
import { EuiDelayRender, EuiLoadingContent } from '@elastic/eui';
import { useUiSetting } from '../ui_settings';
import type { Props } from './code_editor';

const LazyBaseEditor = React.lazy(() => import('./code_editor'));

const Fallback = () => (
  <EuiDelayRender>
    <EuiLoadingContent lines={3} />
  </EuiDelayRender>
);

export const CodeEditor: React.FunctionComponent<Props> = (props) => {
  const darkMode = useUiSetting<boolean>('theme:darkMode');
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyBaseEditor {...props} useDarkTheme={darkMode} />
    </React.Suspense>
  );
};

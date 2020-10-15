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

import { MultiContentProvider } from './multi_content_context';
import { HookProps } from './use_multi_content';

/**
 * HOC to wrap a component with the MultiContentProvider
 *
 * @param Component The component to wrap with the MultiContentProvider
 */
export function WithMultiContent<
  P extends object = { [key: string]: any } // The Props for the wrapped component
>(Component: React.FunctionComponent<P & HookProps<any>>) {
  return function <T extends object = { [key: string]: any }>(props: P & HookProps<T>) {
    const { defaultValue, onChange, ...rest } = props;
    return (
      <MultiContentProvider<T> defaultValue={defaultValue} onChange={onChange}>
        <Component {...(rest as P)} />
      </MultiContentProvider>
    );
  };
}

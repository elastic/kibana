/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

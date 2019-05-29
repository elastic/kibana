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

import { useRef, useEffect } from 'react';
import React from 'react';
import { Ast } from '@kbn/interpreter/common';

import { ExpressionRunnerOptions, ExpressionRunner } from './expression_runner';

// Accept all options of the runner as props except for the
// dom element which is provided by the component itself
export type ExpressionRendererProps = Pick<
  ExpressionRunnerOptions,
  Exclude<keyof ExpressionRunnerOptions, 'element'>
> & {
  expression: string | Ast;
};

export type ExpressionRenderer = React.FC<ExpressionRendererProps>;

export const createRenderer = (run: ExpressionRunner): ExpressionRenderer => ({
  expression,
  ...options
}: ExpressionRendererProps) => {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);

  useEffect(
    () => {
      if (mountpoint.current) {
        run(expression, { ...options, element: mountpoint.current });
      }
    },
    [expression, mountpoint.current]
  );

  return (
    <div
      ref={el => {
        mountpoint.current = el;
      }}
    />
  );
};

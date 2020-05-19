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
import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

type EuiButtonReactRouterProps = EuiButtonProps & {
  to: string;
  children: React.ReactNode;
};

const isModifiedEvent = (event: any) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: any) => event.button === 0;

export function EuiButtonReactRouter({ to, ...props }: EuiButtonReactRouterProps) {
  const history = useHistory();

  function onClick(event: any) {
    if (event.defaultPrevented) {
      return;
    }

    if (event.target.getAttribute('target')) {
      return;
    }

    if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
      return;
    }

    // prevents page reload
    event.preventDefault();
    history.push(to);
  }

  return <EuiButton {...props} href={to} onClick={onClick} />; // eslint-disable-line
}

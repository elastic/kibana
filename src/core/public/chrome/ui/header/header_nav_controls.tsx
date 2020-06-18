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

import { EuiHeaderSectionItem } from '@elastic/eui';
import React from 'react';
import { useObservable } from 'react-use';
import { Observable } from 'rxjs';
import { ChromeNavControl } from '../../nav_controls';
import { HeaderExtension } from './header_extension';

interface Props {
  navControls$: Observable<readonly ChromeNavControl[]>;
  side: 'left' | 'right';
}

export function HeaderNavControls({ navControls$, side }: Props) {
  const navControls = useObservable(navControls$, []);

  if (!navControls) {
    return null;
  }

  // It should be performant to use the index as the key since these are unlikely
  // to change while Kibana is running.
  return (
    <>
      {navControls.map((navControl: ChromeNavControl, index: number) => (
        <EuiHeaderSectionItem key={index} border={side === 'left' ? 'right' : 'left'}>
          <HeaderExtension extension={navControl.mount} />
        </EuiHeaderSectionItem>
      ))}
    </>
  );
}

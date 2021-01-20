/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EuiHeaderSectionItem } from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { ChromeNavControl } from '../../nav_controls';
import { HeaderExtension } from './header_extension';

interface Props {
  navControls$: Observable<readonly ChromeNavControl[]>;
  side?: 'left' | 'right';
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
        <EuiHeaderSectionItem
          key={index}
          border={side ? (side === 'left' ? 'right' : 'left') : 'none'}
        >
          <HeaderExtension extension={navControl.mount} />
        </EuiHeaderSectionItem>
      ))}
    </>
  );
}

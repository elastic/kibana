/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { EuiHeaderSectionItem } from '@elastic/eui';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import type { ChromeNavControl } from '@kbn/core-chrome-browser';
import { HeaderExtension } from './header_extension';

interface Props {
  navControls$: Observable<readonly ChromeNavControl[]>;
  side?: 'left' | 'right';
  append?: JSX.Element | null;
}

export function HeaderNavControls({ navControls$, append = null }: Props) {
  const navControls = useObservable(navControls$, []);

  if (!navControls || navControls.length === 0) {
    return null;
  }

  // It should be performant to use the index as the key since these are unlikely
  // to change while Kibana is running.
  return (
    <>
      {navControls.map((navControl: ChromeNavControl, index: number) => (
        <EuiHeaderSectionItem
          key={index}
          css={css`
            &:has(> :empty) {
              // containers that have empty children should be removed from the layout flow and be unaffected by the flex layout gap of this element's parent flex layout gap
              display: contents;
            }
          `}
        >
          <HeaderExtension extension={navControl.mount} />
        </EuiHeaderSectionItem>
      ))}
      {append}
    </>
  );
}

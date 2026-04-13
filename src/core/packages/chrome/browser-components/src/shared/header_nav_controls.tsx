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
import type { ChromeNavControl } from '@kbn/core-chrome-browser';
import {
  useNavControls,
  useProjectChromeRightControls,
  useProjectHeaderRightNavControls,
  type NavControlPosition,
} from './chrome_hooks';
import { HeaderExtension } from './header_extension';

interface Props {
  position: NavControlPosition;
  append?: JSX.Element | null;
}

interface NavControlItemsProps {
  navControls: ChromeNavControl[];
  append?: JSX.Element | null;
}

export function HeaderNavControlItems({ navControls, append = null }: NavControlItemsProps) {
  if (!navControls || navControls.length === 0) {
    return append ? <>{append}</> : null;
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
          <HeaderExtension extension={navControl.content ?? navControl.mount} />
        </EuiHeaderSectionItem>
      ))}
      {append}
    </>
  );
}

export function HeaderNavControls({ position, append = null }: Props) {
  const navControls = useNavControls(position);
  return <HeaderNavControlItems navControls={navControls} append={append} />;
}

/** Project global header (first bar): right-side controls except `projectChrome: 'appBar'`. */
export function HeaderProjectHeaderRightNavControls() {
  const navControls = useProjectHeaderRightNavControls();
  return <HeaderNavControlItems navControls={navControls} />;
}

/** Project application top bar (second row): `projectChrome: 'appBar'` right-side controls. */
export function HeaderProjectAppBarNavControls() {
  const navControls = useProjectChromeRightControls('appBar');
  return <HeaderNavControlItems navControls={navControls} />;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { css } from '@emotion/css';

import { EuiPortal, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const DropOperationSwitcher = ({
  portalRef,
  isVisible = false,
}: {
  isVisible: boolean;
  portalRef?: HTMLElement | null;
}) =>
  portalRef ? (
    <EuiPortal insert={{ sibling: portalRef, position: 'before' }}>
      <div
        className={css`
          position: absolute;
          background: #0a9dec;
          z-index: 10;
        `}
      >
        <EuiFlexGroup>
          <EuiFlexItem>Content grid item</EuiFlexItem>
          <EuiFlexItem>
            <p>Another content grid item</p>
          </EuiFlexItem>
          <EuiFlexItem>
            <p>
              Note how both of these are the same width and height despite having different content?
            </p>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPortal>
  ) : (
    <div>'Hello'</div>
  );

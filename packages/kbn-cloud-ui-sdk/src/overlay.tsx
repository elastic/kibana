/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiIcon,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';

const noop = () => {
  return;
};

export const Overlay = ({ onClose = noop }: { onClose?: () => void }) => {
  const [maskOpen, changeMask] = useState(true);
  const {
    euiTheme: {
      colors: { shadow },
    },
  } = useEuiTheme();

  if (maskOpen) {
    const textStyle = css`
      text-shadow: 1px 1px 1px ${shadow};
    `;

    const promptStyle = css`
      text-align: center;
      svg {
        filter: drop-shadow(1px 1px 1px ${shadow});
      }
    `;

    return (
      <>
        <EuiOverlayMask>
          <EuiFocusTrap
            onClickOutside={() => {
              changeMask(false);
              onClose();
            }}
          >
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              css={promptStyle}
              onClick={() => {
                changeMask(false);
                onClose();
              }}
            >
              <EuiFlexItem>
                <EuiIcon type="logoElastic" size="xxl" color="ghost" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="ghost" css={textStyle}>
                  A dialog has been opened.
                </EuiText>
                <EuiSpacer size="l" />
                <EuiText size="xs" color="ghost" css={textStyle}>
                  Click to dismiss.
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFocusTrap>
        </EuiOverlayMask>
      </>
    );
  }

  return null;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import styled from '@emotion/styled';
import { getOr } from 'lodash/fp';

interface StyledDivProps {
  targetClassNames: string[];
}

const StyledDiv = styled.div<StyledDivProps>`
  width: 100%;
  display: flex;
  flex-grow: 1;

  > * {
    max-width: 100%;
  }

  ${({ targetClassNames, theme }) => {
    return `
      ${targetClassNames.map((cn) => `.${cn}`).join(', ')} {
        pointer-events: none;
        opacity: 0;
        transition: opacity ${getOr(250, 'eui.euiAnimSpeedNormal', theme)} ease;
        &:focus-visible {
          pointer-events: auto;
          opacity: 1;
        }
      }

      ${targetClassNames.map((cn) => `&:hover .${cn}`).join(', ')} {
        pointer-events: auto;
        opacity: 1;
      }
    `;
  }}
`;

interface HoverVisibilityContainerProps {
  hide?: boolean;
  children: React.ReactNode;
  targetClassNames: string[];
}

export const HoverVisibilityContainer = React.memo<HoverVisibilityContainerProps>(
  ({ hide, targetClassNames, children }) => {
    if (hide) return <>{children}</>;

    return (
      <StyledDiv data-test-subj="hoverVisibilityContainer" targetClassNames={targetClassNames}>
        {children}
      </StyledDiv>
    );
  }
);

HoverVisibilityContainer.displayName = 'HoverVisibilityContainer';

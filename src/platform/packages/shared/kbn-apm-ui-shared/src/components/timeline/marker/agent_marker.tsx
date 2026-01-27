/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import { asDuration } from '../../../utils/formatters';
import type { AgentMark } from '../../../types/mark';
import { Legend } from '../legend';

const NameContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.euiTheme.colors.mediumShade};
  padding-bottom: ${({ theme }) => theme.euiTheme.size.s};
`;

const TimeContainer = styled.div`
  color: ${({ theme }) => theme.euiTheme.colors.mediumShade};
  padding-top: ${({ theme }) => theme.euiTheme.size.s};
`;

interface Props {
  mark: AgentMark;
}

export function AgentMarker({ mark }: Props) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiToolTip
        id={mark.id}
        position="top"
        content={
          <div>
            <NameContainer>{mark.id}</NameContainer>
            <TimeContainer>{asDuration(mark.offset)}</TimeContainer>
          </div>
        }
      >
        <Legend clickable color={euiTheme.colors.mediumShade} />
      </EuiToolTip>
    </>
  );
}

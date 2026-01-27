/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import { truncate } from '../../utils/style';

const tooltipAnchorClassname = '_apm_truncate_tooltip_anchor_';

const TooltipWrapper = styled.div`
  width: 100%;
  .${tooltipAnchorClassname} {
    width: 100% !important;
    display: block !important;
  }
`;

const ContentWrapper = styled.div`
  ${truncate('100%')}
`;

interface Props {
  text: string;
  content?: React.ReactNode;
  'data-test-subj'?: string;
}

export function TruncateWithTooltip(props: Props) {
  const { text, content, ...rest } = props;

  return (
    <TooltipWrapper {...rest}>
      <EuiToolTip
        delay="long"
        content={text}
        anchorClassName={tooltipAnchorClassname}
        disableScreenReaderOutput
      >
        <ContentWrapper>{content || text}</ContentWrapper>
      </EuiToolTip>
    </TooltipWrapper>
  );
}

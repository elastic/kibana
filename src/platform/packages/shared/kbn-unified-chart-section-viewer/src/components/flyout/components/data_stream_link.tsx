/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText, euiTextBreakWord } from '@elastic/eui';
import { css } from '@emotion/react';

interface DataStreamLinkProps {
  dataStream?: string;
  streamUrl?: string;
}

const wrapStyles = css`
  ${euiTextBreakWord()}
`;

/**
 * Renders a data stream name as a navigable link or plain text.
 * When `streamUrl` is provided, the name is rendered as a clickable link.
 */
export const DataStreamLink = ({ dataStream, streamUrl }: DataStreamLinkProps) => {
  if (!dataStream) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="dataStreamEmpty">
        -
      </EuiText>
    );
  }

  if (!streamUrl) {
    return (
      <EuiText size="s" css={wrapStyles} data-test-subj="dataStreamText">
        {dataStream}
      </EuiText>
    );
  }

  return (
    <EuiLink href={streamUrl} data-test-subj="dataStreamLink">
      <EuiText size="s" css={wrapStyles}>
        {dataStream}
      </EuiText>
    </EuiLink>
  );
};

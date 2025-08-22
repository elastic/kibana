/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CSSProperties } from 'react';
import { EuiBadge, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

interface Props {
  currentPosition: CSSProperties;
  path?: string;
}

export const InspectHighlight = ({ currentPosition, path }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { transform, ...rest } = currentPosition;

  const containerCss = css({
    position: 'absolute',
    transform,
    pointerEvents: 'none',
  });

  const highlightCss = css({
    position: 'absolute',
    backgroundColor: transparentize(euiTheme.colors.primary, 0.3),
    border: `2px solid ${euiTheme.colors.primary}`,
    pointerEvents: 'none',
    top: 0,
    left: 0,
    ...rest,
  });

  const badgeCss = css({
    position: 'relative',
    top: rest.height,
    left: 0,
  });

  return (
    <div className={containerCss}>
      <div className={highlightCss} />
      {path && (
        <EuiBadge color="primary" className={badgeCss}>
          {path}
        </EuiBadge>
      )}
    </div>
  );
};

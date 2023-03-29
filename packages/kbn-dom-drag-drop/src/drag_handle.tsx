/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';

// TODO: replace with EuiIcon once it's available there
export const DragHandle: React.FC = (props) => {
  return (
    <div className="domDragDrop__dragHandle" data-test-subj="domDragDrop__dragHandle" {...props}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        css={css`
          display: inline-block;
          inline-size: 16px;
          block-size: 16px;
          vertical-align: middle;
        `}
      >
        <path d="M10 3H9V4H10V3Z" fill="#343741" />
        <path d="M9 6H10V7H9V6Z" fill="#343741" />
        <path d="M9 9H10V10H9V9Z" fill="#343741" />
        <path d="M9 12H10V13H9V12Z" fill="#343741" />
        <path d="M7 3H6V4H7V3Z" fill="#343741" />
        <path d="M7 6H6V7H7V6Z" fill="#343741" />
        <path d="M7 9H6V10H7V9Z" fill="#343741" />
        <path d="M7 12H6V13H7V12Z" fill="#343741" />
      </svg>
    </div>
  );
};

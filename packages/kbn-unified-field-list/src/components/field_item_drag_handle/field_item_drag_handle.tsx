/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * @constructor
 */
export const FieldItemDragHandle: React.FC = () => {
  return (
    <div
      css={css`
        pointer-events: none;
      `}
    >
      <EuiIcon type="grabOmnidirectional" size="s" />
    </div>
  );
};

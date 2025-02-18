/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import Debug from '../debug';
import { Props } from './error';

export const ShowDebugging: FC<Props> = ({ payload }) => {
  const [expanded, setExpanded] = useState(false);

  return process.env.NODE_ENV === 'production' ? null : (
    <div>
      <EuiButtonEmpty
        iconType={expanded ? 'arrowDown' : 'arrowRight'}
        onClick={() => setExpanded(!expanded)}
      >
        See Details
      </EuiButtonEmpty>
      {expanded && (
        <div css={{ height: 260 }}>
          <Debug payload={payload} />
        </div>
      )}
    </div>
  );
};

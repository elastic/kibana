/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiBadge } from '@elastic/eui';
import type { StatusState } from '../lib';

export type StatusWithoutMessage = Omit<StatusState, 'message'>;

interface StatusBadgeProps {
  status: StatusWithoutMessage;
  'data-test-subj'?: string;
}

export const StatusBadge: FC<StatusBadgeProps> = (props) => {
  return (
    <EuiBadge
      data-test-subj={props['data-test-subj']}
      color={props.status.uiColor}
      aria-label={props.status.title}
    >
      {props.status.title}
    </EuiBadge>
  );
};

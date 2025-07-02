/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { asDuration } from '../../utils';
import { PercentOfParent } from './percent_of_parent';

export interface DurationProps {
  duration: number;
  parent?: {
    duration?: number;
    type: 'trace' | 'transaction';
    loading: boolean;
  };
}

export function Duration({ duration, parent }: DurationProps) {
  if (!parent) {
    <EuiText size="xs">{asDuration(duration)}</EuiText>;
  }

  return (
    <EuiText size="xs">
      {asDuration(duration)} &nbsp;
      {parent?.loading && <EuiLoadingSpinner data-test-subj="DurationLoadingSpinner" />}
      {!parent?.loading && parent?.duration && (
        <PercentOfParent
          duration={duration}
          totalDuration={parent?.duration}
          parentType={parent?.type}
        />
      )}
    </EuiText>
  );
}

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
import { EuiInlineEditTextSizes } from '@elastic/eui/src/components/inline_edit/inline_edit_text';
import { asDuration } from '../../utils';
import { PercentOfParent } from './percent_of_parent';

export interface DurationProps {
  duration: number;
  parent?: {
    duration?: number;
    type: 'trace' | 'transaction';
    loading?: boolean;
  };
  size?: EuiInlineEditTextSizes;
}

export function Duration({ duration, parent, size = 's' }: DurationProps) {
  if (!parent) {
    <EuiText size={size}>{asDuration(duration)}</EuiText>;
  }

  return (
    <EuiText size={size}>
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

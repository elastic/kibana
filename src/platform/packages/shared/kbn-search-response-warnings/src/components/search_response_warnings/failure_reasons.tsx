/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SearchResponseWarning } from '../../types';
import { getWarningsParsedReasons } from './i18n_utils';

export interface FailureReasonsProps {
  warnings: SearchResponseWarning[];
}

export const FailureReasons: React.FC<FailureReasonsProps> = ({ warnings }) => {
  const reasons = getWarningsParsedReasons(warnings);

  if (!reasons.size) {
    return null;
  }

  return (
    <div>
      {[...reasons].map((reason) => (
        <div key={reason}>{reason}</div>
      ))}
    </div>
  );
};

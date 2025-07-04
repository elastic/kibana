/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';

import { Status } from './status';
import { CaseStatuses } from './types';
import { getStatusConfiguration } from './config';

const statusConfiguration = getStatusConfiguration();

describe('Stats', () => {
  it.each([[CaseStatuses.open], [CaseStatuses['in-progress']], [CaseStatuses.closed]])(
    'renders correctly with status: %s',
    async (status) => {
      const res = render(<Status status={status} />);
      const label = statusConfiguration[status].label;

      expect(res.getByText(label)).toBeInTheDocument();
    }
  );
});

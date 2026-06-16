/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FieldNameWithIcon } from './field_name_with_icon';
import { render, screen } from '@testing-library/react';

describe('FieldNameWithIcon', () => {
  it('FieldNameWithIcon renders an icon when type is passed', () => {
    render(<FieldNameWithIcon name="agent.name" type="keyword" />);

    expect(screen.getByText('agent.name')).toBeVisible();
    expect(screen.getByText('keyword')).toHaveAttribute('data-euiicon-type', 'tokenKeyword');
  });

  it('FieldNameWithIcon renders only the name when the type is not passed', () => {
    render(<FieldNameWithIcon name="agent.name" />);

    expect(screen.getByText('agent.name')).toBeVisible();
    expect(screen.queryByText('keyword')).not.toBeInTheDocument();
  });
});

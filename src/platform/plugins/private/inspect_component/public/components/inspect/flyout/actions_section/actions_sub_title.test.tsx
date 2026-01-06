/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { ActionsSubTitle } from './actions_sub_title';

const propsMock = {
  relativePath: '/some/relative/path',
  baseFileName: 'someFileName.tsx',
};

describe('ActionsSubTitle', () => {
  it('should render correctly', () => {
    renderWithI18n(<ActionsSubTitle {...propsMock} />);

    const subTitle = screen.getByTestId('inspectComponentActionsSubtitle');
    const fileName = screen.getByText('someFileName.tsx');

    expect(subTitle).toBeInTheDocument();
    expect(fileName).toBeInTheDocument();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FieldList } from './field_list';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

describe('UnifiedFieldList <FieldList />', () => {
  it('should render the loading indicator when processing', () => {
    renderWithI18n(<FieldList isProcessing={true} />);

    expect(screen.getByTestId('fieldListLoading')).toBeVisible();
  });

  it('should not render the loading indicator when not processing', () => {
    renderWithI18n(<FieldList isProcessing={false} />);

    expect(screen.queryByTestId('fieldListLoading')).not.toBeInTheDocument();
  });

  it('should render correctly with content', () => {
    renderWithI18n(
      <FieldList isProcessing={false}>
        <EuiText>{'content'}</EuiText>
      </FieldList>
    );

    expect(screen.getByText('content')).toBeVisible();
  });

  it('should render correctly with additional elements', () => {
    renderWithI18n(
      <FieldList
        append={<EuiText>{'append'}</EuiText>}
        isProcessing={false}
        prepend={<EuiText>{'prepend'}</EuiText>}
      >
        <EuiText>{'content'}</EuiText>
      </FieldList>
    );

    expect(screen.getByText('prepend')).toBeVisible();
    expect(screen.getByText('content')).toBeVisible();
    expect(screen.getByText('append')).toBeVisible();
  });
});

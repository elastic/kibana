/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { ChartContainer } from '.';

describe('ChartContainer', () => {
  describe('loading indicator', () => {
    it('shows loading when loading, not error and has no data', () => {
      const { queryAllByTestId } = render(
        <ChartContainer height={100} loading={true} hasError={false} hasData={false}>
          <div>My amazing component</div>
        </ChartContainer>
      );

      expect(queryAllByTestId('loading')[0]).toBeInTheDocument();
    });
    it('does not show loading when loading not error and has data', () => {
      const { queryAllByText } = render(
        <ChartContainer height={100} loading={true} hasError={false} hasData={true}>
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(queryAllByText('My amazing component')[0]).toBeInTheDocument();
    });
  });

  describe('failure indicator', () => {
    it('shows failure message when has error, has data and no loading', () => {
      const { getByText } = render(
        <ChartContainer height={100} loading={false} hasError={true} hasData={true}>
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(
        getByText('An error happened when trying to fetch data. Please try again')
      ).toBeInTheDocument();
    });
    it('shows failure message when has error, has no data and no loading', () => {
      const { getByText } = render(
        <ChartContainer height={100} loading={false} hasError={true} hasData={false}>
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(
        getByText('An error happened when trying to fetch data. Please try again')
      ).toBeInTheDocument();
    });
  });

  describe('render component', () => {
    it('shows children component when no loading, no error and has data', () => {
      const { getByText } = render(
        <ChartContainer height={100} loading={false} hasError={false} hasData={true}>
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(getByText('My amazing component')).toBeInTheDocument();
    });
    it('shows children component when no loading, no error and has no data', () => {
      const { getByText } = render(
        <ChartContainer height={100} loading={false} hasError={false} hasData={false}>
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(getByText('My amazing component')).toBeInTheDocument();
    });
  });
});

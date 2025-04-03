/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Duration, DurationProps } from '.';
import { render, screen } from '@testing-library/react';

describe('Duration', () => {
  const duration = 10;
  const parentDuration = 20;
  const expectedDurationText = `${duration} μs`;
  const getExpectedParentDurationText = (parentType: string) => `(50% of ${parentType})`;
  const loadingDataTestSubj = 'DurationLoadingSpinner';

  describe('when there is NOT parent data', () => {
    it('should render duration with the right format', () => {
      render(<Duration duration={duration} />);
      expect(screen.getByText(expectedDurationText)).toBeInTheDocument();
    });
  });

  describe('when there is parent data', () => {
    describe('and the loading is set to true', () => {
      const parentWithLoading: DurationProps['parent'] = {
        duration: parentDuration,
        type: 'trace',
        loading: true,
      };

      it('should render the duration and the loader but not the parent duration', () => {
        render(<Duration duration={duration} parent={parentWithLoading} />);
        expect(screen.getByText(expectedDurationText)).toBeInTheDocument();
        expect(screen.getByTestId(loadingDataTestSubj)).toBeInTheDocument();
      });
    });

    describe('and the loading is set to false', () => {
      const parentWithLoading: DurationProps['parent'] = {
        duration: parentDuration,
        type: 'trace',
        loading: false,
      };

      it('should render the duration and the parent duration but not the loader', () => {
        render(<Duration duration={duration} parent={parentWithLoading} />);
        expect(
          screen.getByText(
            `${expectedDurationText} ${getExpectedParentDurationText(parentWithLoading.type)}`
          )
        ).toBeInTheDocument();
        expect(screen.queryByTestId(loadingDataTestSubj)).not.toBeInTheDocument();
      });
    });
  });
});

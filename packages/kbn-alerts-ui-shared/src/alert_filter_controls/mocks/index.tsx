/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { FC } from 'react';
import React, { useEffect } from 'react';
import { AlertFilterControlsProps, AlertFilterControls } from '../alert_filter_controls';
import { TEST_IDS } from '../constants';
import { getControlGroupMock } from './control_group';

/**
 *
 *  Retrieves a sample AlertFilterControls Item.
 *   - Can also call callback onFilterChange with custom args
 *
 * @example
 * const onFilterchangeMock = jest.fn();
 * const onInitMock = jest.fn();
 *
 *const TestComponent = () => (
 *  <TestProviders>
 *    <AlertFilterControls
 *      chainingSystem="NONE"
 *      dataViewId=""
 *      initialControls={[]}
 *      onFilterChange={onFilterchangeMock}
 *      onInit={onInitMock}
 *    />
 *  </TestProviders>
 *);
 *
 *jest.mock('..');
 *
 *describe('Some test', () => {
 *  it('basic test', () => {
 *    (AlertFilterControls as jest.Mock).mockImplementationOnce(
 *      mockAlertFilterControls([
 *        {
 *          meta: {
 *            params: ['open'],
 *          },
 *        },
 *      ])
 *    );
 *
 *    render(<TestComponent />);
 *
 *    expect(onFilterchangeMock.mock.calls[0][0]).toMatchObject([
 *      {
 *        meta: {
 *          params: ['open'],
 *        },
 *      },
 *    ]);
 *  });
 *});
 *
 */
export const mockAlertFilterControls = (outputFilters?: Filter[]) => {
  const Component: FC<AlertFilterControlsProps> = ({ onInit, onFiltersChange }) => {
    useEffect(() => {
      if (onInit) {
        onInit(getControlGroupMock() as unknown as ControlGroupContainer);
      }

      if (onFiltersChange) {
        onFiltersChange(outputFilters ?? []);
      }
    }, [onInit, onFiltersChange]);

    return <div data-test-subj={TEST_IDS.MOCKED_CONTROL} />;
  };

  return Component as unknown as typeof AlertFilterControls;
};

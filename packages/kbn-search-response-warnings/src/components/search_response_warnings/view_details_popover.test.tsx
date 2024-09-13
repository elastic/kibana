/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewDetailsPopover } from './view_details_popover';
import type { SearchResponseWarning } from '../../types';

describe('ViewDetailsPopover', () => {
  describe('single warning', () => {
    const mockOpenInInspector = jest.fn();
    const warnings = [
      {
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: mockOpenInInspector,
      } as SearchResponseWarning,
    ];

    beforeEach(() => {
      mockOpenInInspector.mockReset();
    });

    test('Clicking "view details" button should open warning details', () => {
      render(<ViewDetailsPopover warnings={warnings} />);
      const viewDetailsButton = screen.getByRole('button');
      fireEvent.click(viewDetailsButton);
      expect(mockOpenInInspector).toHaveBeenCalled();
    });

    test('Clicking "view details" link should open warning details', () => {
      render(<ViewDetailsPopover displayAsLink={true} warnings={warnings} />);
      const viewDetailsButton = screen.getByRole('button');
      fireEvent.click(viewDetailsButton);
      expect(mockOpenInInspector).toHaveBeenCalled();
    });
  });

  describe('multiple warnings', () => {
    const request1MockOpenInInspector = jest.fn();
    const request2MockOpenInInspector = jest.fn();
    const warnings = [
      {
        type: 'incomplete',
        requestName: 'My first request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: request1MockOpenInInspector,
      } as SearchResponseWarning,
      {
        type: 'incomplete',
        requestName: 'My second request',
        clusters: {
          remote1: {
            status: 'partial',
            indices: '',
            timed_out: false,
          },
        },
        openInInspector: request2MockOpenInInspector,
      } as SearchResponseWarning,
    ];
    beforeEach(() => {
      request1MockOpenInInspector.mockReset();
      request2MockOpenInInspector.mockReset();
    });

    test('Clicking "view details" button should open popover with button to view details for each warning', () => {
      render(<ViewDetailsPopover warnings={warnings} />);
      const viewDetailsButton = screen.getByRole('button');
      fireEvent.click(viewDetailsButton);
      expect(request1MockOpenInInspector).not.toHaveBeenCalled();
      expect(request2MockOpenInInspector).not.toHaveBeenCalled();

      const openRequest1Button = screen.getByRole('button', { name: 'My first request' });
      fireEvent.click(openRequest1Button);
      expect(request1MockOpenInInspector).toHaveBeenCalled();
      expect(request2MockOpenInInspector).not.toHaveBeenCalled();
    });

    test('Clicking "view details" link should open popover with button to view details for each warning', () => {
      render(<ViewDetailsPopover displayAsLink={true} warnings={warnings} />);
      const viewDetailsButton = screen.getByRole('button');
      fireEvent.click(viewDetailsButton);
      expect(request1MockOpenInInspector).not.toHaveBeenCalled();
      expect(request2MockOpenInInspector).not.toHaveBeenCalled();

      const openRequest1Button = screen.getByRole('button', { name: 'My first request' });
      fireEvent.click(openRequest1Button);
      expect(request1MockOpenInInspector).toHaveBeenCalled();
      expect(request2MockOpenInInspector).not.toHaveBeenCalled();
    });

    test('Should ensure unique request names by numbering duplicate request names', () => {
      const warningsWithDuplicateRequestNames = warnings.map((warning) => {
        return {
          ...warning,
          requestName: 'Request',
        };
      });
      render(
        <ViewDetailsPopover displayAsLink={true} warnings={warningsWithDuplicateRequestNames} />
      );
      const viewDetailsButton = screen.getByRole('button');
      fireEvent.click(viewDetailsButton);

      screen.getByRole('button', { name: 'Request' });
      screen.getByRole('button', { name: 'Request (2)' });
    });
  });
});

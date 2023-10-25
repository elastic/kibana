/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewDetailsPopover } from './view_details_popover';
import type { SearchResponseWarning } from '../../types';

describe('ViewDetailsPopover', () => {
  describe('single warning', () => {
    test('Clicking "view details" should open warning details', () => {
      mockOpenInInspector = jest.fn();
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
      render(<ViewDetailsPopover warnings={warnings} />);
      const viewDetailsButton = screen.getByRole('button');
      fireEvent.click(viewDetailsButton);
      expect(mockOpenInInspector).toHaveBeenCalled();
    });
  });

  describe('multiple warnings', () => {
    test('Clicking "view details" should open popover with buttons to view details for each warning', () => {
      request1MockOpenInInspector = jest.fn();
      request2MockOpenInInspector = jest.fn();
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
  })
  
});
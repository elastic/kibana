/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useImperativeHandle } from 'react';
import { BehaviorSubject } from 'rxjs';

import { setMockedPresentationUtilServices } from '@kbn/presentation-util-plugin/public/mocks';
import { render as rtlRender, waitFor, screen, act } from '@testing-library/react';
import { Action } from '@kbn/ui-actions-plugin/public';

import type { ControlLabelPosition, ControlWidth } from '../../../common';
import { uiActionsService } from '../../services/kibana_services';
import { ControlPanel } from './control_panel';
import { EuiThemeProvider } from '@elastic/eui';

const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: EuiThemeProvider });
};

describe('render', () => {
  let mockApi = {};
  const Component = React.forwardRef((_, ref) => {
    // expose the api into the imperative handle
    useImperativeHandle(ref, () => mockApi, []);

    return <div />;
  }) as any;

  beforeAll(() => {
    setMockedPresentationUtilServices();
    jest.spyOn(uiActionsService, 'getTriggerCompatibleActions').mockResolvedValue([
      {
        isCompatible: jest.fn().mockResolvedValue(true),
        id: 'testAction',
        MenuItem: () => <div>test1</div>,
      },
    ] as unknown as Action[]);
  });

  beforeEach(() => {
    mockApi = {};
    jest.clearAllMocks();
  });

  describe('control width', () => {
    test('defaults to medium and grow enabled', async () => {
      const controlPanel = render(<ControlPanel uuid="control1" Component={Component} />);
      await waitFor(() => {
        const controlFrame = controlPanel.getByTestId('control-frame');
        expect(controlFrame.getAttribute('class')).toContain('controlFrameWrapper--medium');
        expect(controlFrame.getAttribute('class')).toContain('euiFlexItem-grow');
      });
    });

    test('should use small class when using small width', async () => {
      mockApi = {
        uuid: 'control1',
        width$: new BehaviorSubject<ControlWidth>('small'),
      };
      const controlPanel = render(<ControlPanel uuid="control1" Component={Component} />);
      await waitFor(() => {
        const controlFrame = controlPanel.getByTestId('control-frame');
        expect(controlFrame.getAttribute('class')).toContain('controlFrameWrapper--small');
        expect(controlFrame.getAttribute('class')).toContain('euiFlexItem-growZero');
      });
    });
  });

  describe('label position', () => {
    test('should use one line layout class when using one line layout', async () => {
      mockApi = {
        uuid: 'control1',
        parentApi: {
          labelPosition: new BehaviorSubject<ControlLabelPosition>('oneLine'),
        },
      };
      await act(async () => render(<ControlPanel uuid="control1" Component={Component} />));
      const floatingActions = screen.getByTestId('presentationUtil__floatingActions__control1');
      expect(floatingActions).toHaveClass('controlFrameFloatingActions--oneLine');
    });

    test('should use two line layout class when using two line layout', async () => {
      mockApi = {
        uuid: 'control1',
        parentApi: {
          labelPosition: new BehaviorSubject<ControlLabelPosition>('twoLine'),
        },
      };
      await act(async () => render(<ControlPanel uuid="control1" Component={Component} />));
      const floatingActions = screen.getByTestId('presentationUtil__floatingActions__control1');
      expect(floatingActions).toHaveClass('controlFrameFloatingActions--twoLine');
    });
  });
});

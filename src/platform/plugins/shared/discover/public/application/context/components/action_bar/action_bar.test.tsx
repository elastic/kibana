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
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import type { ActionBarProps } from './action_bar';
import { ActionBar } from './action_bar';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE } from '../../services/constants';
import { SurrDocType } from '../../services/context';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';

describe('Test Discover Context ActionBar for successor | predecessor records', () => {
  [SurrDocType.SUCCESSORS, SurrDocType.PREDECESSORS].forEach((type) => {
    const submitForm = (input: HTMLElement) => {
      const form = input.closest('form');
      if (!form) {
        throw new Error('Expected count picker to be rendered inside a form');
      }
      // jsdom doesn't support implicit form submission via Enter key,
      // so we call requestSubmit() directly to simulate it
      form.requestSubmit();
    };

    const renderComponent = (propsOverride: Partial<ActionBarProps> = {}) => {
      const onChangeCount = jest.fn();
      const props: ActionBarProps = {
        defaultStepSize: 5,
        docCount: 20,
        docCountAvailable: 0,
        isDisabled: false,
        isLoading: false,
        onChangeCount,
        type,
        ...propsOverride,
      };

      renderWithKibanaRenderContext(
        <DiscoverTestProvider>
          <ActionBar {...props} />
        </DiscoverTestProvider>
      );

      return {
        onChangeCount,
        input: screen.getByTestId(`${type}CountPicker`),
        button: screen.getByTestId(`${type}LoadMoreButton`),
      };
    };

    test(`${type}: Load button click`, async () => {
      const user = userEvent.setup();
      const { button, onChangeCount } = renderComponent();

      await user.click(button);
      expect(onChangeCount).toHaveBeenCalledWith(type, 25);
    });

    test(`${type}: Load button click doesnt submit when MAX_CONTEXT_SIZE was reached`, async () => {
      const user = userEvent.setup();
      const { button, input, onChangeCount } = renderComponent();

      await user.clear(input);
      await user.type(input, String(MAX_CONTEXT_SIZE));
      await user.tab();

      expect(onChangeCount).toHaveBeenCalledWith(type, MAX_CONTEXT_SIZE);
      onChangeCount.mockClear();

      await user.click(button);
      expect(onChangeCount).toHaveBeenCalledTimes(0);
    });

    test(`${type}: Count input change submits on blur`, async () => {
      const user = userEvent.setup();
      const { input, onChangeCount } = renderComponent();

      await user.clear(input);
      await user.type(input, '123');
      await user.tab();
      expect(onChangeCount).toHaveBeenCalledWith(type, 123);
    });

    test(`${type}: Count input change submits on return`, async () => {
      const user = userEvent.setup();
      const { input, onChangeCount } = renderComponent();

      await user.clear(input);
      await user.type(input, '124');
      submitForm(input);

      expect(onChangeCount).toHaveBeenCalledWith(type, 124);
    });

    test(`${type}: Count input doesnt submits values higher than MAX_CONTEXT_SIZE `, async () => {
      const user = userEvent.setup();
      const { input, onChangeCount } = renderComponent();

      await user.clear(input);
      await user.type(input, String(MAX_CONTEXT_SIZE + 1));
      submitForm(input);

      expect(onChangeCount).toHaveBeenCalledTimes(0);
    });

    test(`${type}: Count input doesnt submits values lower than MIN_CONTEXT_SIZE `, async () => {
      const user = userEvent.setup();
      const { input, onChangeCount } = renderComponent();

      await user.clear(input);
      await user.type(input, String(MIN_CONTEXT_SIZE - 1));
      submitForm(input);

      expect(onChangeCount).toHaveBeenCalledTimes(0);
    });

    test(`${type}: Warning about limitation of additional records`, () => {
      renderComponent();

      if (type === SurrDocType.PREDECESSORS) {
        expect(screen.getByTestId('predecessorsWarningMsg')).toHaveTextContent(
          'No documents newer than the anchor could be found.'
        );
      } else {
        expect(screen.getByTestId('successorsWarningMsg')).toHaveTextContent(
          'No documents older than the anchor could be found.'
        );
      }
    });

    test(`${type}: Load button disabled when defaultStepSize is 0`, async () => {
      const user = userEvent.setup();
      const { input, button, onChangeCount } = renderComponent({ defaultStepSize: 0 });

      expect(button).toBeDisabled();
      await user.click(button);
      expect(onChangeCount).toHaveBeenCalledTimes(0);
      await user.clear(input);
      await user.type(input, '3');
      await user.tab();

      expect(onChangeCount).toHaveBeenCalledWith(type, 3);
      onChangeCount.mockClear();

      await user.click(button);
      expect(onChangeCount).toHaveBeenCalledTimes(1);
    });
  });
});

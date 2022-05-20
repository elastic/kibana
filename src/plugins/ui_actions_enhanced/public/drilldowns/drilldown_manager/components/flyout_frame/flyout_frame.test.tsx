/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { render as renderTestingLibrary, fireEvent } from '@testing-library/react';
import { FlyoutFrame } from '.';

describe('<FlyoutFrame>', () => {
  test('renders without crashing', () => {
    const div = document.createElement('div');
    render(<FlyoutFrame />, div);
  });

  describe('[title=]', () => {
    test('renders title in <h1> tag', () => {
      const div = document.createElement('div');
      render(<FlyoutFrame title={'foobar'} />, div);

      const title = div.querySelector('h1');
      expect(title?.textContent).toBe('foobar');
    });

    test('title can be a react node', () => {
      const div = document.createElement('div');
      render(
        <FlyoutFrame
          title={
            <>
              foo <strong>bar</strong>
            </>
          }
        />,
        div
      );

      const title = div.querySelector('h1');
      expect(title?.innerHTML).toBe('foo <strong>bar</strong>');
    });
  });

  describe('[footer=]', () => {
    test('if [footer=] prop not provided, does not render footer', () => {
      const div = document.createElement('div');
      render(<FlyoutFrame />, div);

      const footer = div.querySelector('[data-test-subj="flyoutFooter"]');
      expect(footer).toBe(null);
    });

    test('can render a React node in footer', () => {
      const div = document.createElement('div');
      render(
        <FlyoutFrame
          footer={
            <>
              a <em>b</em>
            </>
          }
        />,
        div
      );

      const footer = div.querySelector('[data-test-subj="flyoutFooter"]');
      expect(footer?.innerHTML).toBe('a <em>b</em>');
    });
  });

  describe('[onClose=]', () => {
    test('does not render close button if "onClose" prop is missing', () => {
      const div = document.createElement('div');
      render(<FlyoutFrame />, div);

      const closeButton = div.querySelector('[data-test-subj="flyoutCloseButton"]');
      expect(closeButton).toBe(null);
    });

    test('renders close button if "onClose" prop is provided', () => {
      const div = document.createElement('div');
      render(<FlyoutFrame onClose={() => {}} />, div);

      const closeButton = div.querySelector('[data-test-subj="flyoutCloseButton"]');
      expect(closeButton).not.toBe(null);
    });

    test('calls onClose prop when close button clicked', async () => {
      const onClose = jest.fn();
      const el = renderTestingLibrary(<FlyoutFrame onClose={onClose} />);

      const closeButton = el.queryByText('Close');

      expect(onClose).toHaveBeenCalledTimes(0);

      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

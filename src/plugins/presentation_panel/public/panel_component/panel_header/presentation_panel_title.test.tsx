/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { usePresentationPanelTitleClickHandler } from './presentation_panel_title';

describe('usePresentationPanelTitleClickHandler', () => {
  it('returns null when there is no element to attach listeners to', () => {
    const { result } = renderHook(usePresentationPanelTitleClickHandler);

    expect(result.current).toBe(null);
  });

  it('calls the click subscribe handler when the enter button is clicked on the provided element', async () => {
    const mockedClickHandler = jest.fn();

    const TestComponent = ({ onClickHandler }: { onClickHandler: () => void }) => {
      const [$elm, setElm] = useState<HTMLElement | null>(null);
      const onClick$ = usePresentationPanelTitleClickHandler($elm);

      useEffect(() => {
        const subscription = onClick$?.subscribe(onClickHandler);

        return () => subscription?.unsubscribe();
      }, [onClick$, onClickHandler]);

      return (
        <div data-test-subj="syntheticClick" ref={setElm}>
          Hello World
        </div>
      );
    };

    render(<TestComponent onClickHandler={mockedClickHandler} />);

    fireEvent.keyDown(await screen.findByTestId('syntheticClick'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });

    expect(mockedClickHandler).toHaveBeenCalled();
  });
});

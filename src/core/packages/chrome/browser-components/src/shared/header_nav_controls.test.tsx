/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import type { ChromeNavControl } from '@kbn/core-chrome-browser';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { TestChromeProviders } from '../test_helpers';
import { HeaderNavControls } from './header_nav_controls';

const renderWithChrome = (position: 'left' | 'center' | 'right', controls: ChromeNavControl[]) => {
  const chrome = chromeServiceMock.createStartContract();
  const controls$ = new BehaviorSubject<ChromeNavControl[]>(controls);
  const getter =
    position === 'left'
      ? chrome.navControls.getLeft$
      : position === 'center'
      ? chrome.navControls.getCenter$
      : chrome.navControls.getRight$;
  getter.mockReturnValue(controls$);
  return render(
    <TestChromeProviders chrome={chrome}>
      <HeaderNavControls position={position} />
    </TestChromeProviders>
  );
};

describe('HeaderNavControls', () => {
  it('renders nothing when the nav controls list is empty', () => {
    const { container } = renderWithChrome('left', []);
    expect(container.querySelector('.euiHeaderSectionItem')).toBeNull();
  });

  it('renders a ReactNode via the content field', () => {
    renderWithChrome('left', [
      { content: <span data-test-subj="react-control">React Control</span> },
    ]);
    expect(screen.getByTestId('react-control')).toHaveTextContent('React Control');
  });

  it('renders a MountPoint via the deprecated mount field', () => {
    const mountFn = jest.fn((el: HTMLElement) => {
      el.innerHTML = '<span data-test-subj="mount-control">Mounted</span>';
      return () => {
        el.innerHTML = '';
      };
    });
    renderWithChrome('left', [{ mount: mountFn }]);
    expect(screen.getByTestId('mount-control')).toHaveTextContent('Mounted');
  });

  it('prefers content over mount when both are provided', () => {
    const mountFn = jest.fn((_el: HTMLElement) => jest.fn() as () => void);
    renderWithChrome('left', [
      {
        content: <span data-test-subj="content-wins">From content</span>,
        mount: mountFn,
      },
    ]);
    expect(screen.getByTestId('content-wins')).toBeInTheDocument();
    expect(mountFn).not.toHaveBeenCalled();
  });

  it('renders a MountPoint-based nav control by calling the mount function with a DOM element', () => {
    const unmountSpy = jest.fn();
    const mountSpy = jest.fn((_el: HTMLElement) => unmountSpy);
    renderWithChrome('left', [{ mount: mountSpy }]);
    expect(mountSpy).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it('calls the MountPoint unmount callback when unmounted', () => {
    const unmountSpy = jest.fn();
    const { unmount } = renderWithChrome('left', [{ mount: () => unmountSpy }]);
    unmount();
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('renders mixed content and MountPoint controls in the same list', () => {
    const mountSpy = jest.fn((_el: HTMLElement) => jest.fn() as () => void);
    renderWithChrome('right', [
      { content: <span data-test-subj="react-control">React</span> },
      { mount: mountSpy },
      { content: <span data-test-subj="react-control-2">React 2</span> },
    ]);
    expect(screen.getByTestId('react-control')).toBeInTheDocument();
    expect(screen.getByTestId('react-control-2')).toBeInTheDocument();
    expect(mountSpy).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});

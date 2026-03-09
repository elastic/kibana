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
import { HeaderNavControls } from './header_nav_controls';

describe('HeaderNavControls', () => {
  it('renders nothing when the nav controls list is empty', () => {
    const navControls$ = new BehaviorSubject<readonly ChromeNavControl[]>([]);
    const { container } = render(<HeaderNavControls navControls$={navControls$} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a ReactNode via the content field', () => {
    const navControls$ = new BehaviorSubject<readonly ChromeNavControl[]>([
      { content: <span data-test-subj="react-control">React Control</span> },
    ]);
    render(<HeaderNavControls navControls$={navControls$} />);
    expect(screen.getByTestId('react-control')).toHaveTextContent('React Control');
  });

  it('renders a MountPoint via the deprecated mount field', () => {
    const mountFn = jest.fn((el: HTMLElement) => {
      el.innerHTML = '<span data-test-subj="mount-control">Mounted</span>';
      return () => {
        el.innerHTML = '';
      };
    });
    const navControls$ = new BehaviorSubject<readonly ChromeNavControl[]>([{ mount: mountFn }]);
    render(<HeaderNavControls navControls$={navControls$} />);
    expect(screen.getByTestId('mount-control')).toHaveTextContent('Mounted');
  });

  it('prefers content over mount when both are provided', () => {
    const mountFn = jest.fn((_el: HTMLElement) => jest.fn() as () => void);
    const navControls$ = new BehaviorSubject<readonly ChromeNavControl[]>([
      {
        content: <span data-test-subj="content-wins">From content</span>,
        mount: mountFn,
      },
    ]);
    render(<HeaderNavControls navControls$={navControls$} />);
    expect(screen.getByTestId('content-wins')).toBeInTheDocument();
    expect(mountFn).not.toHaveBeenCalled();
  });

  it('renders a MountPoint-based nav control by calling the mount function with a DOM element', () => {
    const unmountSpy = jest.fn();
    const mountSpy = jest.fn((_el: HTMLElement) => unmountSpy);
    const navControls$ = new BehaviorSubject<readonly ChromeNavControl[]>([{ mount: mountSpy }]);
    render(<HeaderNavControls navControls$={navControls$} />);
    expect(mountSpy).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it('calls the MountPoint unmount callback when unmounted', () => {
    const unmountSpy = jest.fn();
    const navControls$ = new BehaviorSubject<readonly ChromeNavControl[]>([
      { mount: () => unmountSpy },
    ]);
    const { unmount } = render(<HeaderNavControls navControls$={navControls$} />);
    unmount();
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('renders mixed content and MountPoint controls in the same list', () => {
    const mountSpy = jest.fn((_el: HTMLElement) => jest.fn() as () => void);
    const navControls$ = new BehaviorSubject<readonly ChromeNavControl[]>([
      { content: <span data-test-subj="react-control">React</span> },
      { mount: mountSpy },
      { content: <span data-test-subj="react-control-2">React 2</span> },
    ]);
    render(<HeaderNavControls navControls$={navControls$} />);
    expect(screen.getByTestId('react-control')).toBeInTheDocument();
    expect(screen.getByTestId('react-control-2')).toBeInTheDocument();
    expect(mountSpy).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});

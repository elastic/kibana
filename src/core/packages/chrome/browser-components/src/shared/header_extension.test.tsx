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
import { HeaderExtension } from './header_extension';

describe('HeaderExtension', () => {
  it('renders nothing when extension is undefined', () => {
    const { container } = render(<HeaderExtension />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('ReactNode extension', () => {
    it('renders a ReactNode extension directly', () => {
      render(<HeaderExtension extension={<span data-test-subj="node-content">hello</span>} />);
      expect(screen.getByTestId('node-content')).toHaveTextContent('hello');
    });

    it('applies display style and containerClassName', () => {
      const { container } = render(
        <HeaderExtension
          extension={<span>test</span>}
          display="inlineBlock"
          containerClassName="my-class"
        />
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper).toHaveStyle({ display: 'inline-block' });
      expect(wrapper).toHaveClass('my-class');
    });
  });

  describe('MountPoint extension', () => {
    const createMountSpy = () => jest.fn((_el: HTMLDivElement) => jest.fn() as () => void);

    it('calls the MountPoint function with a DOM element', () => {
      const mountSpy = createMountSpy();
      render(<HeaderExtension extension={mountSpy} />);
      expect(mountSpy).toHaveBeenCalledWith(expect.any(HTMLElement));
    });

    it('applies display style and containerClassName', () => {
      const mountSpy = createMountSpy();
      render(
        <HeaderExtension extension={mountSpy} display="inlineBlock" containerClassName="my-class" />
      );
      const [element] = mountSpy.mock.calls[0];
      expect(element).toHaveStyle({ display: 'inline-block' });
      expect(element).toHaveClass('my-class');
    });

    it('calls the unmount callback when the component unmounts', () => {
      const unmountSpy = jest.fn();
      const mount = () => unmountSpy;
      const { unmount } = render(<HeaderExtension extension={mount} />);
      unmount();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });
  });
});

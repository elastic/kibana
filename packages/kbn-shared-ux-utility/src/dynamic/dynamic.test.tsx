/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { dynamic } from './dynamic';

export type ExpectTrue<T extends true> = T;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

type MatchesProperty<T, K extends keyof T> = K extends keyof T ? true : false;

describe('dynamic', () => {
  it(`should create a lazy loaded component starting from a dynamic default import`, async () => {
    const LazyTestComponent = dynamic(() => import('./test_component'));

    const { queryByText } = render(<LazyTestComponent>Hello</LazyTestComponent>);

    // Component is suspended and not rendered at first due to lazy loading
    expect(queryByText('Hello Test component')).not.toBeInTheDocument();
    // The component finally renders when is done fetching it
    await waitFor(() => expect(queryByText('Hello Test component')).toBeInTheDocument());
  });

  it(`should create a lazy loaded component starting from a dynamic named import`, async () => {
    const LazyTestComponent = dynamic(() =>
      import('./test_component').then((mod) => ({ default: mod.TestComponent }))
    );

    const { queryByText } = render(<LazyTestComponent>Hello</LazyTestComponent>);

    // Component is suspended and not rendered at first due to lazy loading
    expect(queryByText('Hello Test component')).not.toBeInTheDocument();
    // The component finally renders when is done fetching it
    await waitFor(() => expect(queryByText('Hello Test component')).toBeInTheDocument());
  });

  it(`should accept an optional "fallback" node to display while loading the component`, async () => {
    const LazyTestComponent = dynamic(() => import('./test_component'), {
      fallback: <span>Loading</span>,
    });

    const { queryByText } = render(<LazyTestComponent>Hello</LazyTestComponent>);

    // Component is suspended and display the provided fallback element
    expect(queryByText('Hello Test component')).not.toBeInTheDocument();
    expect(queryByText('Loading')).toBeInTheDocument();
    // The component finally renders when is done fetching it
    await waitFor(() => expect(queryByText('Hello Test component')).toBeInTheDocument());
  });

  describe('the created lazy loaded component', () => {
    it(`should forward the ref property if provided`, async () => {
      const LazyForwardeRefTestComponent = dynamic(() =>
        import('./test_component').then((mod) => ({ default: mod.ForwardeRefTestComponent }))
      );

      const ref = React.createRef<HTMLSpanElement>();

      const { queryByText } = render(
        <LazyForwardeRefTestComponent ref={ref}>Hello</LazyForwardeRefTestComponent>
      );

      // The component finally renders when is done fetching it
      await waitFor(() => expect(queryByText('Hello Test component')).toBeInTheDocument());

      expect(ref.current?.tagName).toBe('SPAN');
    });

    it('should be properly typed respecting the original properties contract', () => {
      const LazyTestComponent = dynamic(() => import('./test_component'));
      const LazyForwardeRefTestComponent = dynamic(() =>
        import('./test_component').then((mod) => ({ default: mod.ForwardeRefTestComponent }))
      );

      type LazyTestComponentProps = React.ComponentPropsWithRef<typeof LazyTestComponent>;
      type LazyForwardeRefTestComponentProps = React.ComponentPropsWithRef<
        typeof LazyForwardeRefTestComponent
      >;

      // @ts-ignore ignore unused tuple Assertion
      type Assertions = [
        ExpectTrue<MatchesProperty<LazyTestComponentProps, 'children'>>,
        ExpectTrue<MatchesProperty<LazyTestComponentProps, 'ref'>>,
        ExpectTrue<MatchesProperty<LazyTestComponentProps, 'customProp'>>,
        ExpectTrue<MatchesProperty<LazyForwardeRefTestComponentProps, 'children'>>,
        ExpectTrue<MatchesProperty<LazyForwardeRefTestComponentProps, 'ref'>>,
        ExpectTrue<MatchesProperty<LazyForwardeRefTestComponentProps, 'customProp'>>
      ];
    });
  });
});

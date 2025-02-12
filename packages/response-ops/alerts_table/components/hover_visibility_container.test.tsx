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
import { HoverVisibilityContainer } from './hover_visibility_container';
import { matchers } from '@emotion/jest';

expect.extend(matchers);

describe('HoverVisibilityContainer', () => {
  const targetClass1 = 'Component1';
  const targetClass2 = 'Component2';
  const Component1 = () => <div className={targetClass1} data-test-subj="component1" />;
  const Component2 = () => <div className={targetClass2} data-test-subj="component2" />;

  test('it renders a transparent inspect button by default', async () => {
    render(
      <HoverVisibilityContainer targetClassNames={[targetClass1, targetClass2]}>
        <Component1 />
        <Component2 />
      </HoverVisibilityContainer>
    );

    expect(getComputedStyle(await screen.findByTestId('component1')).opacity).toBe('0');
    expect(getComputedStyle(await screen.findByTestId('component2')).opacity).toBe('0');
  });

  test('it renders an opaque inspect button when it has mouse focus', async () => {
    render(
      <HoverVisibilityContainer targetClassNames={[targetClass1, targetClass2]}>
        <Component1 />
        <Component2 />
      </HoverVisibilityContainer>
    );

    const hoverVisibilityContainer = await screen.findByTestId('hoverVisibilityContainer');

    expect(hoverVisibilityContainer).toHaveStyleRule('opacity', '1', {
      target: `:hover .${targetClass1}`,
    });
    expect(hoverVisibilityContainer).toHaveStyleRule('opacity', '1', {
      target: `:hover .${targetClass2}`,
    });
  });
});

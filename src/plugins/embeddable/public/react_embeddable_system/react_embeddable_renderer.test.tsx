/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { render, waitFor, screen } from '@testing-library/react';

import React from 'react';
import { registerReactEmbeddableFactory } from './react_embeddable_registry';
import { ReactEmbeddableRenderer } from './react_embeddable_renderer';
import { ReactEmbeddableFactory } from './types';

describe('react embeddable renderer', () => {
  const testEmbeddableFactory: ReactEmbeddableFactory<{ name: string; bork: string }> = {
    deserializeState: jest.fn(),
    getComponent: jest.fn().mockResolvedValue(() => {
      return <div>SUPER TEST COMPONENT</div>;
    }),
  };

  beforeAll(() => {
    registerReactEmbeddableFactory('test', testEmbeddableFactory);
  });

  it('deserializes given state', () => {
    render(<ReactEmbeddableRenderer type={'test'} state={{ rawState: { blorp: 'blorp?' } }} />);
    expect(testEmbeddableFactory.deserializeState).toHaveBeenCalledWith({
      rawState: { blorp: 'blorp?' },
    });
  });

  it('renders the given component once it resolves', () => {
    render(<ReactEmbeddableRenderer type={'test'} state={{ rawState: { blorp: 'blorp?' } }} />);
    waitFor(() => {
      expect(screen.findByText('SUPER TEST COMPONENT')).toBeInTheDocument();
    });
  });
});

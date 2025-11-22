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
import { EuiProvider } from '@elastic/eui';
import { SafeRender, createSafeRender } from './safe_render';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<EuiProvider colorMode="light">{ui}</EuiProvider>);
};

describe('SafeRender', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful rendering', () => {
    it('renders children when no error occurs', () => {
      renderWithProviders(
        <SafeRender>{() => <div data-test-subj="success">Success</div>}</SafeRender>
      );

      expect(screen.getByTestId('success')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('renders complex children successfully', () => {
      renderWithProviders(
        <SafeRender>
          {() => (
            <div>
              <span>First</span>
              <span>Second</span>
            </div>
          )}
        </SafeRender>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('renders null children without error', () => {
      const { container } = renderWithProviders(<SafeRender>{() => null}</SafeRender>);

      // Should not throw and container should be defined.
      expect(container).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('catches synchronous render errors', () => {
      const errorRenderer = () => {
        throw new Error('Sync error');
      };

      renderWithProviders(<SafeRender columnKey="test">{errorRenderer}</SafeRender>);

      expect(screen.getByTestId('content-list-table-render-error')).toBeInTheDocument();
    });

    it('displays error icon when render fails', () => {
      const errorRenderer = () => {
        throw new Error('Test error');
      };

      renderWithProviders(<SafeRender>{errorRenderer}</SafeRender>);

      expect(screen.getByTestId('content-list-table-render-error')).toBeInTheDocument();
    });

    it('logs error to console in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const errorRenderer = () => {
        throw new Error('Dev error');
      };

      renderWithProviders(<SafeRender columnKey="testColumn">{errorRenderer}</SafeRender>);

      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('includes column key in error logging', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const errorRenderer = () => {
        throw new Error('Column error');
      };

      renderWithProviders(<SafeRender columnKey="myColumn">{errorRenderer}</SafeRender>);

      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('myColumn'),
        expect.any(Error)
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('handles errors without column key', () => {
      const errorRenderer = () => {
        throw new Error('No key error');
      };

      renderWithProviders(<SafeRender>{errorRenderer}</SafeRender>);

      expect(screen.getByTestId('content-list-table-render-error')).toBeInTheDocument();
    });
  });

  describe('error boundary behavior', () => {
    it('catches synchronous errors thrown directly in render function', () => {
      // This tests the try/catch in the render method, not the error boundary.
      const errorRenderer = () => {
        throw new Error('Direct error');
      };

      renderWithProviders(<SafeRender columnKey="test">{errorRenderer}</SafeRender>);

      // Should show error indicator.
      expect(screen.getByTestId('content-list-table-render-error')).toBeInTheDocument();
    });
  });
});

describe('createSafeRender', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a wrapped render function', () => {
    const originalRender = (item: { name: string }) => <span>{item.name}</span>;
    const safeRender = createSafeRender(originalRender, 'testColumn');

    expect(typeof safeRender).toBe('function');
  });

  it('renders successfully when no error', () => {
    const originalRender = (item: { name: string }) => (
      <span data-test-subj="item-name">{item.name}</span>
    );
    const safeRender = createSafeRender(originalRender);

    renderWithProviders(<>{safeRender({ name: 'Test' })}</>);

    expect(screen.getByTestId('item-name')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('catches errors from the render function', () => {
    const errorRender = (_item: { name: string }) => {
      throw new Error('Render failed');
    };
    const safeRender = createSafeRender(errorRender, 'errorColumn');

    renderWithProviders(<>{safeRender({ name: 'Test' })}</>);

    expect(screen.getByTestId('content-list-table-render-error')).toBeInTheDocument();
  });

  it('passes item to the original render function', () => {
    const originalRender = jest.fn().mockReturnValue(<span>Rendered</span>);
    const safeRender = createSafeRender(originalRender);

    const item = { id: '123', value: 'test' };
    renderWithProviders(<>{safeRender(item)}</>);

    expect(originalRender).toHaveBeenCalledWith(item);
  });

  it('works with different item types', () => {
    interface CustomItem {
      id: string;
      data: { nested: boolean };
    }

    const originalRender = (item: CustomItem) => (
      <span data-test-subj="nested">{item.data.nested ? 'yes' : 'no'}</span>
    );
    const safeRender = createSafeRender(originalRender);

    renderWithProviders(<>{safeRender({ id: '1', data: { nested: true } })}</>);

    expect(screen.getByTestId('nested')).toHaveTextContent('yes');
  });

  it('handles null return from render function', () => {
    const nullRender = () => null;
    const safeRender = createSafeRender(nullRender);

    const { container } = renderWithProviders(<>{safeRender({})}</>);

    // Should not throw.
    expect(container).toBeDefined();
  });
});

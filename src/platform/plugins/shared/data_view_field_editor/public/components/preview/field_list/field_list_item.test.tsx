/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewListItem } from './field_list_item';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useFieldPreviewContext } from '../field_preview_context';
import type { PreviewController } from '../preview_controller';
import { BehaviorSubject } from 'rxjs';

vi.mock('../field_preview_context', async () => {
  const mocked = {
    ...(await vi.importActual('../field_preview_context')),
    useFieldPreviewContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
const mockUseFieldPreviewContext = vi.mocked(useFieldPreviewContext);

const previewController = {
  state$: new BehaviorSubject({
    isLoadingPreview: false,
  }),
} as any as PreviewController;

type ComponentProps = React.ComponentProps<typeof PreviewListItem>;

const setup = (props: Partial<ComponentProps>) => {
  const user = userEvent.setup();

  mockUseFieldPreviewContext.mockReturnValue({
    controller: previewController,
  } as any);

  const finalProps: ComponentProps = {
    field: { key: 'test', value: 'test', formattedValue: 'test', isPinned: false },
    toggleIsPinned: vi.fn(),
    hasScriptError: false,
    isFromScript: false,
    ...props,
  };

  render(
    <IntlProvider locale="en">
      <PreviewListItem {...finalProps} />
    </IntlProvider>
  );

  return { props: finalProps, user };
};

afterAll(() => {
  vi.clearAllMocks();
});

describe('<PreviewListItem />', () => {
  describe('formattedValue rendering', () => {
    it('should render a plain ReactNode formattedValue inline', () => {
      setup({
        field: {
          key: 'test',
          value: 'hello',
          formattedValue: <span>hello world</span>,
          isPinned: false,
        },
      });

      expect(screen.getByText('hello world')).toBeInTheDocument();
    });

    it('should fall back to JSON.stringify when formattedValue is undefined', () => {
      setup({
        field: { key: 'test', value: { foo: 'bar' }, formattedValue: undefined, isPinned: false },
      });

      expect(screen.getByText('{"foo":"bar"}')).toBeInTheDocument();
    });

    it('should render a "View image" button instead of the formatted value', async () => {
      const { user } = setup({
        field: {
          key: 'test',
          value: 'http://example.com/img.png',
          formattedValue: <img src="http://example.com/img.png" alt="test" />,
          isPinned: false,
        },
      });

      expect(screen.getByRole('button', { name: /view image/i })).toBeInTheDocument();
      expect(screen.queryByText('http://example.com/img.png')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /view image/i }));

      expect(screen.getByRole('dialog', { name: /image preview/i })).toBeInTheDocument();
    });
  });

  describe('when toggleIsPinned is not provided', () => {
    it('should not render the pin button', () => {
      // When
      setup({ toggleIsPinned: undefined });

      // Then
      expect(screen.queryByRole('button', { name: /pin field/i })).not.toBeInTheDocument();
    });
  });

  describe('when toggleIsPinned is provided', () => {
    it('should render the pin button', () => {
      // When
      setup({ toggleIsPinned: vi.fn() });

      // Then
      expect(screen.getByRole('button', { name: /pin field/i })).toBeInTheDocument();
    });

    describe('when clicked', () => {
      it('should call toggleIsPined', async () => {
        // When
        const toggleIsPinned = vi.fn();
        const { props, user } = setup({ toggleIsPinned });

        // Then
        const pinButton = screen.getByRole('button', { name: /pin field/i });
        await user.click(pinButton);

        expect(toggleIsPinned).toHaveBeenCalledWith(props.field.key, {
          isKeyboardEvent: false,
          buttonId: `fieldPreview.pinFieldButtonLabel.${props.field.key}`,
        });
      });
    });

    describe('when the user tabs to the button and presses Enter', () => {
      it('should call toggleIsPinned', async () => {
        // When
        const toggleIsPinned = vi.fn();
        const { props, user } = setup({ toggleIsPinned });

        // Then
        await user.tab();
        await user.keyboard('{enter}');

        expect(toggleIsPinned).toHaveBeenCalledWith(props.field.key, {
          isKeyboardEvent: true,
          buttonId: `fieldPreview.pinFieldButtonLabel.${props.field.key}`,
        });
      });
    });
  });
});

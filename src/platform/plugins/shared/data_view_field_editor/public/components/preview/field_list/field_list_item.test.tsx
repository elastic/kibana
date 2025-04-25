/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PreviewListItem } from './field_list_item';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useFieldPreviewContext } from '../field_preview_context';
import { PreviewController } from '../preview_controller';
import { BehaviorSubject } from 'rxjs';

jest.mock('../field_preview_context', () => ({
  ...jest.requireActual('../field_preview_context'),
  useFieldPreviewContext: jest.fn(),
}));
const mockUseFieldPreviewContext = jest.mocked(useFieldPreviewContext);

const previewController = {
  state$: new BehaviorSubject({
    isLoadingPreview: false,
  }),
} as any as PreviewController;

type ComponentProps = React.ComponentProps<typeof PreviewListItem>;

const setup = (props: Partial<ComponentProps>) => {
  mockUseFieldPreviewContext.mockReturnValue({
    controller: previewController,
  } as any);

  const finalProps: ComponentProps = {
    field: { key: 'test', value: 'test', formattedValue: 'test', isPinned: false },
    toggleIsPinned: jest.fn(),
    hasScriptError: false,
    isFromScript: false,
    ...props,
  };

  render(
    <IntlProvider locale="en">
      <PreviewListItem {...finalProps} />
    </IntlProvider>
  );

  return { props: finalProps };
};

afterAll(() => {
  jest.clearAllMocks();
});

describe('<PreviewListItem />', () => {
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
      setup({ toggleIsPinned: jest.fn() });

      // Then
      expect(screen.getByRole('button', { name: /pin field/i })).toBeInTheDocument();
    });

    describe('when clicked', () => {
      it('should call toggleIsPined', () => {
        // When
        const toggleIsPinned = jest.fn();
        const { props } = setup({ toggleIsPinned });

        // Then
        const pinButton = screen.getByRole('button', { name: /pin field/i });
        fireEvent.click(pinButton);

        expect(toggleIsPinned).toHaveBeenCalledWith(props.field.key);
      });
    });
  });
});

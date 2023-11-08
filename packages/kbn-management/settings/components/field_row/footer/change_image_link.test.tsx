/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { ChangeImageLink, type ChangeImageLinkProps } from './change_image_link';
import { wrap } from '../mocks';

const IMAGE = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADMElEQVR4nOzVwQnAIBQFQYXff81RUkQCOyDj1YOPnbXWPmeTRef+/3O/OyBjzh3CD95BfqICMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMK0CMO0TAAD//2Anhf4QtqobAAAAAElFTkSuQmCC
`;

describe('ChangeImageLink', () => {
  const defaultProps: ChangeImageLinkProps = {
    field: {
      id: 'test',
      type: 'image',
      ariaAttributes: {
        ariaLabel: 'test',
      },
      isOverridden: false,
      savedValue: null,
    },
    unsavedChange: undefined,
    onClear: jest.fn(),
  };

  it('does not render with no saved value and no unsaved change', () => {
    const { container } = render(wrap(<ChangeImageLink {...defaultProps} />));
    expect(container.firstChild).toBeNull();
  });

  it('renders with a saved value and no unsaved change', () => {
    const { container } = render(
      wrap(
        <ChangeImageLink {...defaultProps} field={{ ...defaultProps.field, savedValue: IMAGE }} />
      )
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render if there is a saved value and the unsaved value is undefined', () => {
    const { container } = render(
      wrap(
        <ChangeImageLink
          {...defaultProps}
          field={{ ...defaultProps.field, savedValue: IMAGE }}
          unsavedChange={{ type: 'image', unsavedValue: undefined }}
        />
      )
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when there is an unsaved change', () => {
    const { container } = render(
      wrap(
        <ChangeImageLink
          {...defaultProps}
          field={{ ...defaultProps.field, savedValue: IMAGE }}
          unsavedChange={{ type: 'image', unsavedValue: 'unsaved value' }}
        />
      )
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders nothing if the unsaved change value is undefined', () => {
    const { container } = render(
      wrap(
        <ChangeImageLink
          {...defaultProps}
          unsavedChange={{ type: 'image', unsavedValue: undefined }}
        />
      )
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders an aria-label', () => {
    const { getByLabelText } = render(
      wrap(
        <ChangeImageLink {...defaultProps} field={{ ...defaultProps.field, savedValue: IMAGE }} />
      )
    );
    const link = getByLabelText('Change test');
    expect(link).not.toBeNull();
  });
});

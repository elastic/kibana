/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { ChangeImageLink } from './change_image_link';
import { ImageFieldDefinition } from '@kbn/management-settings-types';
import { wrap } from '../mocks';
import { IMAGE } from '@kbn/management-settings-field-definition/storybook';

describe('ChangeImageLink', () => {
  const defaultProps = {
    field: {
      name: 'test',
      type: 'image',
      ariaAttributes: {
        ariaLabel: 'test',
      },
    } as ImageFieldDefinition,
    onChange: jest.fn(),
    onCancel: jest.fn(),
    onReset: jest.fn(),
    unsavedChange: undefined,
  };

  it('does not render no saved value and no unsaved change', () => {
    const { container } = render(
      wrap(<ChangeImageLink {...defaultProps} field={{ ...defaultProps.field }} />)
    );
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

  it('renders if there is a saved value and the unsaved value is undefined', () => {
    const { container } = render(
      wrap(
        <ChangeImageLink
          {...defaultProps}
          field={{ ...defaultProps.field, savedValue: IMAGE }}
          unsavedChange={{ type: 'image', unsavedValue: undefined }}
        />
      )
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders nothing when there is an unsaved change', () => {
    const { container } = render(
      wrap(
        <ChangeImageLink
          {...defaultProps}
          field={{ ...defaultProps.field, savedValue: IMAGE }}
          unsavedChange={{ type: 'image', unsavedValue: 'unsaved value' }}
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

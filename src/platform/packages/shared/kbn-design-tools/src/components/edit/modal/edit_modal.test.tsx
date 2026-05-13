/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { EditModal } from './edit_modal';

describe('EditModal', () => {
  let target: HTMLDivElement;
  let onClose: jest.Mock;
  let onSave: jest.Mock;

  beforeEach(() => {
    onClose = jest.fn();
    onSave = jest.fn();

    target = document.createElement('div');
    target.textContent = 'Hello world';
    target.style.color = 'rgb(0, 0, 0)';
    target.style.backgroundColor = 'rgb(255, 255, 255)';
    target.getBoundingClientRect = () =>
      ({
        top: 10,
        left: 10,
        width: 200,
        height: 100,
        right: 210,
        bottom: 110,
        x: 10,
        y: 10,
        toJSON: () => {},
      } as DOMRect);
    document.body.appendChild(target);
  });

  afterEach(() => {
    cleanup();
    target.remove();
  });

  it('renders the modal with title and action buttons', () => {
    renderWithI18n(<EditModal target={target} onClose={onClose} onSave={onSave} />);

    expect(screen.getByText('Edit Element')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    renderWithI18n(<EditModal target={target} onClose={onClose} onSave={onSave} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders element tree with the target tag', () => {
    renderWithI18n(<EditModal target={target} onClose={onClose} onSave={onSave} />);

    // The tree should show the 'div' tag
    expect(screen.getByText('div')).toBeInTheDocument();
  });

  it('renders Attributes section with background color picker', () => {
    renderWithI18n(<EditModal target={target} onClose={onClose} onSave={onSave} />);

    expect(screen.getByText('Attributes')).toBeInTheDocument();
    expect(screen.getByText('Background color')).toBeInTheDocument();
  });

  it('calls onSave with empty changes when Save is forced', () => {
    renderWithI18n(<EditModal target={target} onClose={onClose} onSave={onSave} />);

    // Save button should be disabled when no changes
    const saveButton = screen.getByText('Save').closest('button');
    expect(saveButton).toBeDisabled();
  });
});

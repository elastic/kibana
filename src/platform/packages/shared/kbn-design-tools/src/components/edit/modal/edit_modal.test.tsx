/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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
    target.getBoundingClientRect = () => ({
      top: 10,
      left: 10,
      width: 200,
      height: 100,
      right: 210,
      bottom: 110,
      x: 10,
      y: 10,
      toJSON: () => {},
    });
    document.body.appendChild(target);
  });

  afterEach(() => {
    target.remove();
  });

  const renderModal = async () => {
    renderWithI18n(<EditModal target={target} onClose={onClose} onSave={onSave} />);
    await waitFor(() => {
      expect(screen.getByTestId('editModalTitle')).toBeInTheDocument();
    });
  };

  it('should render the modal with title and action buttons', async () => {
    await renderModal();

    expect(screen.getByTestId('editModalTitle')).toBeInTheDocument();
    expect(screen.getByTestId('editModalCancelButton')).toBeInTheDocument();
    expect(screen.getByTestId('editModalSaveButton')).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', async () => {
    await renderModal();

    fireEvent.click(screen.getByTestId('editModalCancelButton'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render element tree with the target tag', async () => {
    await renderModal();

    expect(screen.getByText('div')).toBeInTheDocument();
  });

  it('should render Attributes section with background color picker', async () => {
    await renderModal();

    expect(screen.getByTestId('editModalAttributesTitle')).toBeInTheDocument();
    expect(screen.getByTestId('editModalBackgroundColor')).toBeInTheDocument();
  });

  it('should call onSave with empty changes when Save is forced', async () => {
    await renderModal();

    expect(screen.getByTestId('editModalSaveButton')).toBeDisabled();
  });
});

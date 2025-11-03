/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DeleteDataViewFlyout, type RemoveDataViewProps } from './delete_data_view_flyout';
import type {
  SavedObjectRelation,
  SavedObjectRelationKind,
} from '@kbn/saved-objects-management-plugin/common';

jest.mock('./delete_data_view_flyout_content', () => ({
  DeleteModalContent: jest.fn(() => <div data-testid="delete-modal-content" />),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addDanger: jest.fn(),
        },
      },
    },
  }),
}));

const mockDataViews = {
  delete: jest.fn(),
};

const defaultProps = {
  dataViews: mockDataViews as any,
  dataViewArray: [
    {
      id: '1',
      title: 'Test Data View',
      getName: () => 'Test Data View',
    },
  ] as RemoveDataViewProps[],
  selectedRelationships: {
    '1': [],
  },
  hasSpaces: false,
  onDelete: jest.fn(),
  onClose: jest.fn(),
};

describe('DeleteDataViewFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders flyout with title and buttons', () => {
    render(<DeleteDataViewFlyout {...defaultProps} />);
    expect(screen.getByText('Delete Data View')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByTestId('delete-modal-content')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<DeleteDataViewFlyout {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('disables Delete button if not all relationships reviewed', () => {
    // Simulate a relationship that needs review
    const props = {
      ...defaultProps,
      selectedRelationships: {
        '1': [
          {
            id: 'rel1',
            type: 'dashboard',
            relationshipType: 'child' as SavedObjectRelationKind,
            meta: {},
          },
        ],
      } as unknown as Record<string, SavedObjectRelation[]>,
    };
    render(<DeleteDataViewFlyout {...props} />);
    expect(screen.getByText('Delete').closest('button')).toBeDisabled();
  });

  it('enables Delete button if all relationships reviewed', () => {
    // Simulate reviewedItems size matches relationships needing review
    const props = {
      ...defaultProps,
      selectedRelationships: {
        '1': [
          {
            id: 'rel1',
            type: 'dashboard',
            relationshipType: 'child' as SavedObjectRelationKind,
            meta: {},
          },
        ],
      } as unknown as Record<string, SavedObjectRelation[]>,
    };
    // Patch useState to simulate reviewedItems
    const useStateSpy = jest.spyOn(React, 'useState');
    useStateSpy.mockImplementationOnce(() => [new Set(['rel1']), jest.fn()]);
    render(<DeleteDataViewFlyout {...props} />);
    expect(screen.getByText('Delete').closest('button')).not.toBeDisabled();
    useStateSpy.mockRestore();
  });

  it('enables Delete button if no relationships exist', () => {
    // Simulate reviewedItems size matches relationships needing review
    const props = {
      ...defaultProps,
      selectedRelationships: {
        '1': [],
      } as unknown as Record<string, SavedObjectRelation[]>,
    };
    render(<DeleteDataViewFlyout {...props} />);
    expect(screen.getByText('Delete').closest('button')).not.toBeDisabled();
  });

  it('calls dataViews.delete and onDelete when Delete is clicked', async () => {
    // Simulate no relationships to review
    render(<DeleteDataViewFlyout {...defaultProps} />);
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(deleteButton);
    });
    expect(mockDataViews.delete).toHaveBeenCalledWith('1');
    expect(defaultProps.onDelete).toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiText } from '@elastic/eui';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FieldPopover } from './field_popover';
import { FieldPopoverHeader } from './field_popover_header';

describe('UnifiedFieldList <FieldPopover />', () => {
  it('should render correctly header only', async () => {
    const { container } = renderWithKibanaRenderContext(
      <FieldPopover
        isOpen
        closePopover={jest.fn()}
        button={<EuiButton title="test" />}
        renderHeader={() => <EuiText>{'header'}</EuiText>}
      />
    );

    expect(screen.getByText('header')).toBeInTheDocument();

    expect(container.querySelector('.euiPopoverTitle')).not.toBeInTheDocument();
    expect(container.querySelector('.euiPopoverFooter')).not.toBeInTheDocument();
  });

  it('should render correctly with header and content', async () => {
    renderWithKibanaRenderContext(
      <FieldPopover
        isOpen
        closePopover={jest.fn()}
        button={<EuiButton title="test" />}
        renderHeader={() => <EuiText>{'header'}</EuiText>}
        renderContent={() => <EuiText>{'content'}</EuiText>}
      />
    );

    expect(screen.getByText('header')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('should render nothing if popover is closed', async () => {
    renderWithKibanaRenderContext(
      <FieldPopover
        isOpen={false}
        closePopover={jest.fn()}
        button={<EuiButton title="test" />}
        renderHeader={() => <EuiText>{'header'}</EuiText>}
        renderContent={() => <EuiText>{'content'}</EuiText>}
      />
    );

    expect(screen.queryByText('header')).not.toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('should render correctly with popover header and content', async () => {
    const mockClose = jest.fn();
    const mockEdit = jest.fn();
    const fieldName = 'extension';

    renderWithKibanaRenderContext(
      <FieldPopover
        isOpen
        closePopover={mockClose}
        button={<EuiButton title="test" />}
        renderHeader={() => (
          <FieldPopoverHeader
            field={dataView.fields.find((field) => field.name === fieldName)!}
            closePopover={mockClose}
            onEditField={mockEdit}
          />
        )}
        renderContent={() => <EuiText>{'content'}</EuiText>}
      />
    );

    expect(screen.getByText(fieldName)).toBeInTheDocument();

    expect(screen.getByText('content')).toBeInTheDocument();

    const editButton = screen.getByTestId(`fieldPopoverHeader_editField-${fieldName}`);
    await userEvent.click(editButton);

    expect(mockClose).toHaveBeenCalled();
    expect(mockEdit).toHaveBeenCalledWith(fieldName);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { getExceptionListItemSchemaMock } from '../../mocks/exception_list_item_schema.mock';
import { ExceptionItemCardHeader } from '.';
import { fireEvent, render } from '@testing-library/react';
import { actions, handleDelete, handleEdit } from '../../mocks/header.mock';

describe('ExceptionItemCardHeader', () => {
  it('it should render item name', () => {
    const wrapper = render(
      <ExceptionItemCardHeader
        item={getExceptionListItemSchemaMock()}
        dataTestSubj="exceptionItemHeader"
        actions={actions}
      />
    );

    expect(wrapper.getByTestId('exceptionItemHeaderTitle')).toHaveTextContent('some name');
  });

  it('it should display actions', () => {
    const wrapper = render(
      <ExceptionItemCardHeader
        actions={actions}
        item={getExceptionListItemSchemaMock()}
        dataTestSubj="exceptionItemHeader"
      />
    );

    fireEvent.click(wrapper.getByTestId('exceptionItemHeaderButtonIcon'));
    fireEvent.click(wrapper.getByTestId('exceptionItemHeaderActionItemedit'));
    expect(handleEdit).toHaveBeenCalled();

    fireEvent.click(wrapper.getByTestId('exceptionItemHeaderActionItemdelete'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('it should disable actions if disableActions is true', () => {
    const wrapper = render(
      <ExceptionItemCardHeader
        actions={actions}
        item={getExceptionListItemSchemaMock()}
        disableActions
        dataTestSubj="exceptionItemHeader"
      />
    );

    expect(wrapper.getByTestId('exceptionItemHeaderButtonIcon')).toBeDisabled();
  });
});

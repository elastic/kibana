/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { getExceptionListItemSchemaMock } from '../../test_helpers/exception_list_item_schema.mock';
import * as i18n from '../translations';
import { ExceptionItemCardHeader } from './header';
import { fireEvent, render } from '@testing-library/react';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

const handleEdit = jest.fn();
const handleDelete = jest.fn();
const actions = [
  {
    key: 'edit',
    icon: 'pencil',
    label: i18n.exceptionItemCardEditButton(ExceptionListTypeEnum.DETECTION),
    onClick: handleEdit,
  },
  {
    key: 'delete',
    icon: 'trash',
    label: i18n.exceptionItemCardDeleteButton(ExceptionListTypeEnum.DETECTION),
    onClick: handleDelete,
  },
];
describe('ExceptionItemCardHeader', () => {
  it('it renders item name', () => {
    const wrapper = render(
      <ExceptionItemCardHeader
        item={getExceptionListItemSchemaMock()}
        dataTestSubj="exceptionItemHeader"
        actions={actions}
      />
    );

    expect(wrapper.getByTestId('exceptionItemHeaderTitle')).toHaveTextContent('some name');
  });

  it('it displays actions', () => {
    const wrapper = render(
      <ExceptionItemCardHeader
        actions={actions}
        item={getExceptionListItemSchemaMock()}
        dataTestSubj="exceptionItemHeader"
      />
    );

    // click on popover
    fireEvent.click(wrapper.getByTestId('exceptionItemHeaderActionButton'));
    fireEvent.click(wrapper.getByTestId('exceptionItemHeaderActionItemedit'));
    expect(handleEdit).toHaveBeenCalled();

    fireEvent.click(wrapper.getByTestId('exceptionItemHeaderActionItemdelete'));
    expect(handleDelete).toHaveBeenCalled();
  });

  it('it disables actions if disableActions is true', () => {
    const wrapper = render(
      <ExceptionItemCardHeader
        actions={actions}
        item={getExceptionListItemSchemaMock()}
        disableActions
        dataTestSubj="exceptionItemHeader"
      />
    );

    expect(wrapper.getByTestId('exceptionItemHeaderActionButton')).toBeDisabled();
  });
});

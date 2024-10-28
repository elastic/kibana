/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { act, renderHook } from '@testing-library/react-hooks';
import { getExceptionListItemSchemaMock } from '../mocks/exception_list_item_schema.mock';
import { useExceptionItemCard } from './use_exception_item_card';
import * as i18n from './translations';
import { mockGetFormattedComments } from '../mocks/comments.mock';

const onEditException = jest.fn();
const onDeleteException = jest.fn();
const getFormattedComments = jest.fn();
const exceptionItem = getExceptionListItemSchemaMock();
describe('useExceptionItemCard', () => {
  it('should call onEditException with the correct params', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionItemCard({
        listType: ExceptionListTypeEnum.DETECTION,
        exceptionItem,
        onEditException,
        onDeleteException,
        getFormattedComments,
      })
    );
    const { actions } = current;

    act(() => {
      actions[0].onClick();
    });
    expect(onEditException).toHaveBeenCalledWith(exceptionItem);
  });
  it('should call onDeleteException with the correct params', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionItemCard({
        listType: ExceptionListTypeEnum.DETECTION,
        exceptionItem,
        onEditException,
        onDeleteException,
        getFormattedComments,
      })
    );
    const { actions } = current;

    act(() => {
      actions[1].onClick();
    });
    expect(onDeleteException).toHaveBeenCalledWith({
      id: exceptionItem.id,
      name: exceptionItem.name,
      namespaceType: exceptionItem.namespace_type,
    });
  });
  it('should return the default actions labels', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionItemCard({
        listType: ExceptionListTypeEnum.DETECTION,
        exceptionItem,
        onEditException,
        onDeleteException,
        getFormattedComments,
      })
    );
    const { actions } = current;
    const [editAction, deleteAction] = actions;

    expect(editAction.label).toEqual(
      i18n.exceptionItemCardEditButton(ExceptionListTypeEnum.DETECTION)
    );
    expect(deleteAction.label).toEqual(
      i18n.exceptionItemCardDeleteButton(ExceptionListTypeEnum.DETECTION)
    );
  });
  it('should return the default sent labels props', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionItemCard({
        listType: ExceptionListTypeEnum.DETECTION,
        exceptionItem,
        editActionLabel: 'Edit',
        deleteActionLabel: 'Delete',
        onEditException,
        onDeleteException,
        getFormattedComments,
      })
    );
    const { actions } = current;
    const [editAction, deleteAction] = actions;

    expect(editAction.label).toEqual('Edit');
    expect(deleteAction.label).toEqual('Delete');
  });
  it('should return formattedComments', () => {
    const {
      result: { current },
    } = renderHook(() =>
      useExceptionItemCard({
        listType: ExceptionListTypeEnum.DETECTION,
        exceptionItem,
        editActionLabel: 'Edit',
        deleteActionLabel: 'Delete',
        onEditException,
        onDeleteException,
        getFormattedComments: mockGetFormattedComments,
      })
    );
    const { formattedComments } = current;
    expect(formattedComments[0].username).toEqual('some user');
  });
});

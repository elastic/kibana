/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ExceptionItemCard } from '.';
import { getExceptionListItemSchemaMock } from '../mocks/exception_list_item_schema.mock';
import { getCommentsArrayMock, mockGetFormattedComments } from '../mocks/comments.mock';
import { MockedShowValueListModal } from '../mocks/value_list_modal.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { rules } from '../mocks/rule_references.mock';

describe('ExceptionItemCard', () => {
  it('it renders header, item meta information and conditions', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: [] };

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={rules}
        dataTestSubj="item"
        onDeleteException={jest.fn()}
        onEditException={jest.fn()}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
        showValueListModal={MockedShowValueListModal}
      />
    );

    expect(wrapper.getByTestId('exceptionItemCardHeaderContainer')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardMetaInfo')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardConditions')).toBeInTheDocument();
    expect(wrapper.queryByTestId('exceptionsViewerCommentAccordion')).not.toBeInTheDocument();
  });

  it('it should render the header, item meta information, conditions, and the comments', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: getCommentsArrayMock() };

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        dataTestSubj="item"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={rules}
        onDeleteException={jest.fn()}
        onEditException={jest.fn()}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={mockGetFormattedComments}
        showValueListModal={MockedShowValueListModal}
      />
    );

    expect(wrapper.getByTestId('exceptionItemCardHeaderContainer')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardMetaInfo')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardConditions')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionsItemCommentAccordion')).toBeInTheDocument();
  });

  it('it should not render edit or delete action buttons when "disableActions" is "true"', () => {
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <ExceptionItemCard
        disableActions={true}
        onDeleteException={jest.fn()}
        onEditException={jest.fn()}
        exceptionItem={exceptionItem}
        dataTestSubj="item"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={rules}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.queryByTestId('itemActionButton')).not.toBeInTheDocument();
  });

  it('it should invoke the "onEditException" when edit button clicked', () => {
    const mockOnEditException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        dataTestSubj="exceptionItemCardHeader"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={rules}
        onDeleteException={jest.fn()}
        onEditException={mockOnEditException}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
        showValueListModal={MockedShowValueListModal}
      />
    );

    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderButtonIcon'));
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderActionItemedit'));
    expect(mockOnEditException).toHaveBeenCalledWith(getExceptionListItemSchemaMock());
  });

  it('it should invoke the "onDeleteException" when delete button clicked', () => {
    const mockOnDeleteException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        dataTestSubj="exceptionItemCardHeader"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={rules}
        onEditException={jest.fn()}
        onDeleteException={mockOnDeleteException}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
        showValueListModal={MockedShowValueListModal}
      />
    );
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderButtonIcon'));
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderActionItemdelete'));

    expect(mockOnDeleteException).toHaveBeenCalledWith({
      id: '1',
      name: 'some name',
      namespaceType: 'single',
    });
  });

  it('it should render comment accordion closed to begin with', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        dataTestSubj="exceptionItemCardHeader"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={rules}
        onEditException={jest.fn()}
        onDeleteException={jest.fn()}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={mockGetFormattedComments}
        showValueListModal={MockedShowValueListModal}
      />
    );

    expect(wrapper.getByTestId('exceptionsItemCommentAccordion')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardComments')).toBeVisible();
    expect(wrapper.getByTestId('accordionContentPanel')).not.toBeVisible();
  });
});

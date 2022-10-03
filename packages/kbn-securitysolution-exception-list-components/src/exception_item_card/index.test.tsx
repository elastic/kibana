/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ExceptionItemCard } from '.';
import { getExceptionListItemSchemaMock } from '../test_helpers/exception_list_item_schema.mock';
import { getCommentsArrayMock } from '../test_helpers/comments.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

const ruleReferences: unknown[] = [
  {
    exception_lists: [
      {
        id: '123',
        list_id: 'i_exist',
        namespace_type: 'single',
        type: 'detection',
      },
      {
        id: '456',
        list_id: 'i_exist_2',
        namespace_type: 'single',
        type: 'detection',
      },
    ],
    id: '1a2b3c',
    name: 'Simple Rule Query',
    rule_id: 'rule-2',
  },
];
describe('ExceptionItemCard', () => {
  it('it renders header, item meta information and conditions', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: [] };

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={ruleReferences}
        dataTestSubj="item"
        onDeleteException={jest.fn()}
        onEditException={jest.fn()}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
      />
    );

    expect(wrapper.getByTestId('exceptionItemCardHeaderContainer')).toBeInTheDocument();
    // expect(wrapper.getByTestId('exceptionItemCardMetaInfo')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardConditions')).toBeInTheDocument();
    // expect(wrapper.queryByTestId('exceptionsViewerCommentAccordion')).not.toBeInTheDocument();
  });

  it('it renders header, item meta information, conditions, and comments if any exist', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: getCommentsArrayMock() };

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        dataTestSubj="item"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={ruleReferences}
        onDeleteException={jest.fn()}
        onEditException={jest.fn()}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
      />
    );

    expect(wrapper.getByTestId('exceptionItemCardHeaderContainer')).toBeInTheDocument();
    // expect(wrapper.getByTestId('exceptionItemCardMetaInfo')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardConditions')).toBeInTheDocument();
    // expect(wrapper.getByTestId('exceptionsViewerCommentAccordion')).toBeInTheDocument();
  });

  it('it does not render edit or delete action buttons when "disableActions" is "true"', () => {
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <ExceptionItemCard
        disableActions={true}
        onDeleteException={jest.fn()}
        onEditException={jest.fn()}
        exceptionItem={exceptionItem}
        dataTestSubj="item"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={ruleReferences}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
      />
    );
    expect(wrapper.queryByTestId('itemActionButton')).not.toBeInTheDocument();
  });

  it('it invokes "onEditException" when edit button clicked', () => {
    const mockOnEditException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        dataTestSubj="exceptionItemCardHeader"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={ruleReferences}
        onDeleteException={jest.fn()}
        onEditException={mockOnEditException}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
      />
    );

    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderActionButton'));
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderActionItemedit'));
    expect(mockOnEditException).toHaveBeenCalledWith(getExceptionListItemSchemaMock());
  });

  it('it invokes "onDeleteException" when delete button clicked', () => {
    const mockOnDeleteException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <ExceptionItemCard
        exceptionItem={exceptionItem}
        dataTestSubj="exceptionItemCardHeader"
        listType={ExceptionListTypeEnum.DETECTION}
        ruleReferences={ruleReferences}
        onEditException={jest.fn()}
        onDeleteException={mockOnDeleteException}
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
        getFormattedComments={() => []}
      />
    );
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderActionButton'));
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeaderActionItemdelete'));

    expect(mockOnDeleteException).toHaveBeenCalledWith({
      id: '1',
      name: 'some name',
      namespaceType: 'single',
    });
  });

  // TODO Fix this Test
  // it('it renders comment accordion closed to begin with', () => {
  //   const exceptionItem = getExceptionListItemSchemaMock();
  //   exceptionItem.comments = getCommentsArrayMock();
  //   const wrapper = render(
  //     <ExceptionItemCard
  //       exceptionItem={exceptionItem}
  //       dataTestSubj="item"
  //       listType={ExceptionListTypeEnum.DETECTION}
  //       ruleReferences={ruleReferences}
  //       onEditException={jest.fn()}
  //       onDeleteException={jest.fn()}
  //     />
  //   );

  //   expect(wrapper.queryByTestId('accordion-comment-list')).not.toBeVisible();
  // });
});

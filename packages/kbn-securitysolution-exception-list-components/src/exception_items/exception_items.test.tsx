/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { getExceptionListItemSchemaMock } from '../mocks/exception_list_item_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionItems } from '.';

import { ViewerStatus } from '../types';
import { render } from '@testing-library/react';

const onCreateExceptionListItem = jest.fn();
const onDeleteException = jest.fn();
const onEditExceptionItem = jest.fn();
const onPaginationChange = jest.fn();

const pagination = { pageIndex: 0, pageSize: 0, totalItemCount: 0 };

describe('ExceptionsViewerItems', () => {
  describe('Viewing EmptyViewerState', () => {
    it('it renders empty prompt if "viewerStatus" is "empty"', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={ViewerStatus.EMPTY}
          exceptions={[]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={{}}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
        />
      );
      // expect(wrapper).toMatchSnapshot();
      expect(wrapper.getByTestId('emptyViewerState')).toBeInTheDocument();
      expect(wrapper.queryByTestId('exceptionsContainer')).not.toBeInTheDocument();
    });

    it('it renders no search results found prompt if "viewerStatus" is "empty_search"', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={ViewerStatus.EMPTY_SEARCH}
          exceptions={[]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={{}}
          lastUpdated={Date.now()}
          isReadOnly={false}
          pagination={pagination}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
        />
      );
      // expect(wrapper).toMatchSnapshot();
      expect(wrapper.getByTestId('emptySearchViewerState')).toBeInTheDocument();
      expect(wrapper.queryByTestId('exceptionsContainer')).not.toBeInTheDocument();
    });

    it('it renders exceptions if "viewerStatus" and "null"', () => {
      const wrapper = render(
        <ExceptionItems
          viewerStatus={'' as ViewerStatus}
          exceptions={[getExceptionListItemSchemaMock()]}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={{}}
          isReadOnly={false}
          pagination={pagination}
          lastUpdated={Date.now()}
          onCreateExceptionListItem={onCreateExceptionListItem}
          onDeleteException={onDeleteException}
          onEditExceptionItem={onEditExceptionItem}
          onPaginationChange={onPaginationChange}
          securityLinkAnchorComponent={() => null}
          formattedDateComponent={() => null}
          exceptionsUtilityComponent={() => null}
          getFormattedComments={() => []}
        />
      );
      // expect(wrapper).toMatchSnapshot();
      expect(wrapper.getByTestId('exceptionsContainer')).toBeTruthy();
    });
  });
  // TODO Add Exception Items and Pagination interactions
});

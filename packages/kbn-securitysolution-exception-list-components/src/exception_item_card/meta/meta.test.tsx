/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { getExceptionListItemSchemaMock } from '../../mocks/exception_list_item_schema.mock';

import { ExceptionItemCardMetaInfo } from '.';
import { rules } from '../../mocks/rule_references.mock';

describe('ExceptionItemCardMetaInfo', () => {
  it('it should render creation info with sending custom formattedDateComponent', () => {
    const wrapper = render(
      <ExceptionItemCardMetaInfo
        item={getExceptionListItemSchemaMock()}
        rules={rules}
        dataTestSubj="exceptionItemMeta"
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={({ fieldName, value }) => (
          <>
            <p>{new Date(value).toDateString()}</p>
          </>
        )}
      />
    );

    expect(wrapper.getByTestId('exceptionItemMetaCreatedBylastUpdate')).toHaveTextContent(
      'Mon Apr 20 2020'
    );
    expect(wrapper.getByTestId('exceptionItemMetaCreatedBylastUpdateValue')).toHaveTextContent(
      'some user'
    );
  });

  it('it should render udate info with sending custom formattedDateComponent', () => {
    const wrapper = render(
      <ExceptionItemCardMetaInfo
        item={getExceptionListItemSchemaMock()}
        rules={rules}
        dataTestSubj="exceptionItemMeta"
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={({ fieldName, value }) => (
          <>
            <p>{new Date(value).toDateString()}</p>
          </>
        )}
      />
    );
    expect(wrapper.getByTestId('exceptionItemMetaUpdatedBylastUpdate')).toHaveTextContent(
      'Mon Apr 20 2020'
    );
    expect(wrapper.getByTestId('exceptionItemMetaUpdatedBylastUpdateValue')).toHaveTextContent(
      'some user'
    );
  });

  it('it should render references info', () => {
    const wrapper = render(
      <ExceptionItemCardMetaInfo
        item={getExceptionListItemSchemaMock()}
        rules={rules}
        dataTestSubj="exceptionItemMeta"
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
      />
    );

    expect(wrapper.getByTestId('exceptionItemMetaEmptyButton')).toHaveTextContent('Affects 1 rule');
  });

  it('it should render references info when multiple references exist', () => {
    const wrapper = render(
      <ExceptionItemCardMetaInfo
        item={getExceptionListItemSchemaMock()}
        rules={[
          {
            exceptions_list: [
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
          {
            exceptions_list: [
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
            id: 'aaa',
            name: 'Simple Rule Query 2',
            rule_id: 'rule-3',
          },
        ]}
        dataTestSubj="exceptionItemMeta"
        securityLinkAnchorComponent={() => null}
        formattedDateComponent={() => null}
      />
    );

    expect(wrapper.getByTestId('exceptionItemMetaEmptyButton')).toHaveTextContent(
      'Affects 2 rules'
    );
  });
});

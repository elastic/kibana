/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ExceptionListHeader } from '.';
import * as i18n from '../translations';
import { securityLinkAnchorComponentMock } from '../mocks/security_link_component.mock';

const onEditListDetails = jest.fn();
const onExportList = jest.fn();
const onDeleteList = jest.fn();
const onManageRules = jest.fn();

describe('ExceptionListHeader', () => {
  it('should render the List Header with name, default Description and disabled actions  because of the ReadOnly mode', () => {
    const wrapper = render(
      <ExceptionListHeader
        name="List Name"
        isReadonly
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
      />
    );
    expect(wrapper).toMatchSnapshot();
    fireEvent.click(wrapper.getByTestId('RightSideMenuItemsContainer'));
    expect(wrapper.queryByTestId('MenuActions')).not.toBeInTheDocument();
    expect(wrapper.getByTestId('DescriptionText')).toHaveTextContent(
      i18n.EXCEPTION_LIST_HEADER_DESCRIPTION
    );
    expect(wrapper.queryByTestId('EditTitleIcon')).not.toBeInTheDocument();
  });
});

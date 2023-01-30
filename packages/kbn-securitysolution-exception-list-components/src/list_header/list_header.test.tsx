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

import { useExceptionListHeader as useExceptionListHeaderMock } from './use_list_header';
const onEditListDetails = jest.fn();
const onExportList = jest.fn();
const onDeleteList = jest.fn();
const onManageRules = jest.fn();
const onNavigate = jest.fn();
jest.mock('./use_list_header');

describe('ExceptionListHeader', () => {
  beforeAll(() => {
    (useExceptionListHeaderMock as jest.Mock).mockReturnValue({
      isModalVisible: false,
      listDetails: { name: 'List Name', description: '' },
      onSave: jest.fn(),
      onCancel: jest.fn(),
    });
  });
  it('should render the List Header with name, default description and disabled actions because of the ReadOnly mode', () => {
    const wrapper = render(
      <ExceptionListHeader
        listId="List_Id"
        name="List Name"
        isReadonly
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );
    expect(wrapper).toMatchSnapshot();
    fireEvent.click(wrapper.getByTestId('RightSideMenuItemsMenuActionsItems'));
    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsButtonIcon')).toBeDisabled();
    expect(wrapper.getByTestId('DescriptionText')).toHaveTextContent(
      i18n.EXCEPTION_LIST_HEADER_DESCRIPTION
    );
    expect(wrapper.queryByTestId('EditTitleIcon')).not.toBeInTheDocument();
    expect(wrapper.getByTestId('ListID')).toHaveTextContent(
      `${i18n.EXCEPTION_LIST_HEADER_LIST_ID}:List_Id`
    );
    expect(wrapper.getByTestId('Breadcrumb')).toHaveTextContent(
      i18n.EXCEPTION_LIST_HEADER_BREADCRUMB
    );
  });
  it('should render the List Header with name, default description and disabled actions because user can not edit details', () => {
    const wrapper = render(
      <ExceptionListHeader
        listId="List_Id"
        name="List Name"
        isReadonly={false}
        canUserEditList={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );
    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsButtonIcon')).toBeEnabled();
    fireEvent.click(wrapper.getByTestId('RightSideMenuItemsMenuActionsButtonIcon'));
    expect(wrapper).toMatchSnapshot();

    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsActionItem1')).toBeEnabled();
    expect(wrapper.queryByTestId('RightSideMenuItemsMenuActionsActionItem2')).toBeDisabled();
    expect(wrapper.queryByTestId('EditTitleIcon')).not.toBeInTheDocument();
  });
  it('should render the List Header with name, default description and  actions', () => {
    const wrapper = render(
      <ExceptionListHeader
        name="List Name"
        listId="List_Id"
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );
    expect(wrapper).toMatchSnapshot();
    fireEvent.click(wrapper.getByTestId('RightSideMenuItemsContainer'));
    expect(wrapper.getByTestId('DescriptionText')).toHaveTextContent(
      i18n.EXCEPTION_LIST_HEADER_DESCRIPTION
    );
    expect(wrapper.queryByTestId('TitleEditIcon')).toBeInTheDocument();
    expect(wrapper.queryByTestId('DescriptionEditIcon')).toBeInTheDocument();
  });
  it('should render edit modal', () => {
    (useExceptionListHeaderMock as jest.Mock).mockReturnValue({
      isModalVisible: true,
      listDetails: { name: 'List Name', description: 'List description' },
      onSave: jest.fn(),
      onCancel: jest.fn(),
    });
    const wrapper = render(
      <ExceptionListHeader
        name="List Name"
        listId="List_Id"
        description="List description"
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        backOptions={{ pageId: '', path: '', onNavigate }}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('EditModal')).toBeInTheDocument();
  });
  it('should go back the page path when back button is clicked', () => {
    (useExceptionListHeaderMock as jest.Mock).mockReturnValue({
      isModalVisible: true,
      listDetails: { name: 'List Name', description: 'List description' },
      onSave: jest.fn(),
      onCancel: jest.fn(),
    });
    const wrapper = render(
      <ExceptionListHeader
        name="List Name"
        listId="List_Id"
        description="List description"
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
        backOptions={{ pageId: '', path: 'test-path', onNavigate }}
      />
    );
    fireEvent.click(wrapper.getByTestId('Breadcrumb'));
    expect(onNavigate).toBeCalledWith('test-path');
  });
});

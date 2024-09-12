/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MenuItems } from '.';
import { rules } from '../../mocks/rule_references.mock';
import { securityLinkAnchorComponentMock } from '../../mocks/security_link_component.mock';

const onExportList = jest.fn();
const onDeleteList = jest.fn();
const onManageRules = jest.fn();
const onDuplicateList = jest.fn();
describe('MenuItems', () => {
  it('should render linkedRules, manageRules and menuActions', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        linkedRules={rules}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('LinkedRulesMenuItems')).toHaveTextContent('Linked to 1 rules');
    expect(wrapper.getByTestId('LinkRulesButton')).toBeInTheDocument();
    expect(wrapper.getByTestId('MenuActionsButtonIcon')).toBeInTheDocument();
  });
  it('should not render linkedRules HeaderMenu component, instead should render a text', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId('LinkedRulesMenuItems')).not.toBeInTheDocument();
    expect(wrapper.getByTestId('noLinkedRules')).toBeInTheDocument();
  });
  it('should render all menu actions enabled', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        linkedRules={[]}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    fireEvent.click(wrapper.getByTestId('MenuActionsButtonIcon'));
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('MenuActionsActionItem1')).toBeEnabled();
    expect(wrapper.getByTestId('MenuActionsActionItem2')).toBeEnabled();
    expect(wrapper.getByTestId('MenuActionsActionItem3')).toBeEnabled();
  });
  it('should render delete action disabled when "canUserEditList" is "false"', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        canUserEditList={false}
        linkedRules={rules}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    fireEvent.click(wrapper.getByTestId('MenuActionsButtonIcon'));
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('MenuActionsActionItem1')).toBeEnabled();
    expect(wrapper.getByTestId('MenuActionsActionItem2')).toBeDisabled();
    expect(wrapper.getByTestId('MenuActionsActionItem3')).toBeDisabled();
  });
  it('should not render Manage rules', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        canUserEditList={false}
        linkedRules={rules}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId('LinkRulesButton')).not.toBeInTheDocument();
  });
  it('should call onManageRules', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        linkedRules={rules}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    fireEvent.click(wrapper.getByTestId('LinkRulesButton'));
    expect(onManageRules).toHaveBeenCalled();
  });
  it('should call onExportModalOpen', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        linkedRules={rules}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    fireEvent.click(wrapper.getByTestId('MenuActionsButtonIcon'));
    fireEvent.click(wrapper.getByTestId('MenuActionsActionItem1'));

    expect(onExportList).toHaveBeenCalled();
  });
  it('should call onDeleteList', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        linkedRules={rules}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    fireEvent.click(wrapper.getByTestId('MenuActionsButtonIcon'));
    fireEvent.click(wrapper.getByTestId('MenuActionsActionItem3'));

    expect(onDeleteList).toHaveBeenCalled();
  });

  it('should call onDuplicateList', () => {
    const wrapper = render(
      <MenuItems
        isReadonly={false}
        linkedRules={rules}
        securityLinkAnchorComponent={securityLinkAnchorComponentMock}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onDuplicateList={onDuplicateList}
        onManageRules={onManageRules}
      />
    );
    fireEvent.click(wrapper.getByTestId('MenuActionsButtonIcon'));
    fireEvent.click(wrapper.getByTestId('MenuActionsActionItem2'));

    expect(onDuplicateList).toHaveBeenCalled();
  });
});

import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiListingTable,
  KuiListingTableNoMatchesPrompt,
} from '../../../../components';

import {
  RIGHT_ALIGNMENT
} from '../../../../src/services';

function renderToolBarActions() {
  return [
    <KuiButton
      key="add"
      buttonType="primary"
      aria-label="Add"
    >
      Add
    </KuiButton>,
    <KuiButton
      key="settings"
      aria-label="Settings"
      buttonType="basic"
      icon={<KuiButtonIcon type="settings"/>}
    />,
    <KuiButton
      key="menu"
      aria-label="Menu"
      buttonType="basic"
      icon={<KuiButtonIcon type="menu"/>}
    />
  ];
}

function renderHeader() {
  return [
    'Title',
    'Status',
    'Date created',
    {
      content: 'Orders of magnitude',
      align: RIGHT_ALIGNMENT
    }
  ];
}

export function ListingTableWithNoItems() {
  return (
    <KuiListingTable
      toolBarActions={renderToolBarActions()}
      header={renderHeader()}
      onFilter={() => {}}
      filter="hello"
      prompt={<KuiListingTableNoMatchesPrompt />}
      onItemSelectionChanged={() => {}}
    />
  );
}

import React from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiPager,
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiListingTable,
  KuiTableHeaderCell
} from '../../../../components';

function renderEmptyTablePrompt() {
  return (
    <KuiEmptyTablePromptPanel>
      <KuiEmptyTablePrompt
        actions={<KuiButton buttonType="primary">Add Items</KuiButton>}
        message="Uh oh you have no items!"
      />
    </KuiEmptyTablePromptPanel>
  );
}

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

function renderPager() {
  return (
    <KuiPager
      startNumber={1}
      hasNextPage={true}
      hasPreviousPage={false}
      endNumber={10}
      totalItems={100}
      onNextPage={() => {
      }}
      onPreviousPage={() => {
      }}
    />
  );
}

function renderHeader() {
  return [
    <KuiTableHeaderCell key="title">
      Title
    </KuiTableHeaderCell>,
    <KuiTableHeaderCell key="status">
      Status
    </KuiTableHeaderCell>,
    <KuiTableHeaderCell key="created">
      Date created
    </KuiTableHeaderCell>,
    <KuiTableHeaderCell
      key="order"
      className="kuiTableHeaderCell--alignRight"
    >
      Orders of magnitude
    </KuiTableHeaderCell>
  ];
}

export function ListingTableWithEmptyPrompt() {
  return (
    <KuiListingTable
      pager={renderPager()}
      toolBarActions={renderToolBarActions()}
      header={renderHeader()}
      onFilter={() => {}}
      filter=""
      prompt={renderEmptyTablePrompt()}
      onItemSelectionChanged={() => {}}
    />
  );
}

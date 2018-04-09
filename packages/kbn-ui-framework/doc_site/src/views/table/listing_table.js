import React, { Component } from 'react';

import {
  KuiButton,
  KuiButtonIcon,
  KuiPager,
  KuiListingTable,
} from '../../../../components';

import {
  RIGHT_ALIGNMENT
} from '../../../../src/services';

export class ListingTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedRowIds: [],
    };

    this.rows = [
      {
        id: '1',
        cells: [
          <a className="kuiLink" href="#">Alligator</a>,
          <div className="kuiIcon kuiIcon--success fa-check"/>,
          'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
          {
            content: '1',
            align: RIGHT_ALIGNMENT
          },
        ]
      },
      {
        id: '2',
        cells: [
          <a className="kuiLink" href="#">Boomerang</a>,
          <div className="kuiIcon kuiIcon--success fa-check"/>,
          'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
          {
            content: '10',
            align: RIGHT_ALIGNMENT
          },
        ]
      },
      {
        id: '3',
        cells: [
          <a className="kuiLink" href="#">Celebration</a>,
          <div className="kuiIcon kuiIcon--warning fa-bolt"/>,
          'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
          {
            content: '100',
            align: RIGHT_ALIGNMENT
          },
        ]
      },
      {
        id: '4',
        cells: [
          <a className="kuiLink" href="#">Dog</a>,
          <div className="kuiIcon kuiIcon--error fa-warning"/>,
          'Tue Dec 06 2016 12:56:15 GMT-0800 (PST)',
          {
            content: '1000',
            align: RIGHT_ALIGNMENT
          },
        ]
      }
    ];

    this.header = [
      'Title',
      'Status',
      'Date created',
      {
        content: 'Orders of magnitude',
        onSort: () => {},
        isSorted: true,
        isSortAscending: true,
        align: RIGHT_ALIGNMENT,
      }
    ];
  }

  renderPager() {
    return (
      <KuiPager
        startNumber={1}
        hasNextPage={true}
        hasPreviousPage={false}
        endNumber={10}
        totalItems={100}
        onNextPage={() => {}}
        onPreviousPage={() => {}}
      />
    );
  }

  renderToolBarActions() {
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
        icon={<KuiButtonIcon type="settings" />}
      />,
      <KuiButton
        key="menu"
        aria-label="Menu"
        buttonType="basic"
        icon={<KuiButtonIcon type="menu" />}
      />
    ];
  }

  onItemSelectionChanged = (selectedRowIds) => {
    this.setState({ selectedRowIds });
  };

  render() {
    return (
      <KuiListingTable
        pager={this.renderPager()}
        toolBarActions={this.renderToolBarActions()}
        selectedRowIds={this.state.selectedRowIds}
        rows={this.rows}
        header={this.header}
        onFilter={() => {}}
        filter=""
        onItemSelectionChanged={this.onItemSelectionChanged}
      />
    );
  }
}

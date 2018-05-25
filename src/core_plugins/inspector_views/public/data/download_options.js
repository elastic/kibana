import React, { Component } from 'react';

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';

import { exportAsCsv } from './lib/export_csv';

class DataDownloadOptions extends Component {

  state = {
    isPopoverOpen: false,
  };

  onTogglePopover = () => {
    this.setState(state => ({
      isPopoverOpen: !state.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  exportAsCsv = () => {
    exportAsCsv(`${this.props.title}.csv`, this.props.columns, this.props.rows);
  };

  exportAsRawCsv = () => {
    exportAsCsv(`${this.props.title}.csv`, this.props.columns, this.props.rawData);
  };

  render() {
    const button = (
      <EuiButton
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onTogglePopover}
      >
        Download data
      </EuiButton>
    );
    const items = [
      (
        <EuiContextMenuItem
          key="csv"
          onClick={this.exportAsCsv}
          toolTipContent="Downloads the data as shown in the table."
          toolTipPosition="left"
        >
          Formatted CSV
        </EuiContextMenuItem>
      )
    ];
    if (this.props.rawData) {
      items.push(
        <EuiContextMenuItem
          key="rawCsv"
          onClick={this.exportAsRawCsv}
          toolTipContent={`Downloads the raw data i.e. dates as timestamps,
            numeric values without thousand separators, etc.`}
          toolTipPosition="left"
        >
          Raw CSV
        </EuiContextMenuItem>
      );
    }
    return (
      <EuiPopover
        id="inspectorDownloadData"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={items}
        />
      </EuiPopover>
    );
  }
}

export { DataDownloadOptions };

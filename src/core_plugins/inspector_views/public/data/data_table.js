import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './data_table.less';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiToolTip,
} from '@elastic/eui';

import { DataDownloadOptions } from './download_options';

class DataTableFormat extends Component {

  state = { };

  static renderCell(col, value) {
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          { value }
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="inspector-table__filter">
          <EuiFlexGroup
            gutterSize="none"
            alignItems="center"
          >
            { col.filter &&
              <EuiToolTip
                position="bottom"
                content="Filter for value"
              >
                <EuiButtonIcon
                  iconType="plusInCircle"
                  color="text"
                  aria-label="Filter for value"
                  onClick={() => col.filter(value)}
                />
              </EuiToolTip>
            }
            { col.filterOut &&
              <EuiFlexItem grow={false} className="inspector-table__filter">
                <EuiToolTip
                  position="bottom"
                  content="Filter out value"
                >
                  <EuiButtonIcon
                    iconType="minusInCircle"
                    color="text"
                    aria-label="Filter out value"
                    onClick={() => col.filterOut(value)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            }
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  static getDerivedStateFromProps({ data }) {
    if (!data) {
      return {
        columns: null,
        rowsRaw: null,
        rows: null,
      };
    }

    const columns = data.columns.map(col => ({
      name: col.name,
      field: col.field,
      sortable: true,
      render: (value) => DataTableFormat.renderCell(col, value),
    }));

    return { columns, rowsRaw: data.rowsRaw, rows: data.rows };
  }

  render() {
    const { columns, rows } = this.state;
    const search = {
      toolsRight: [
        <DataDownloadOptions
          columns={this.state.columns}
          rows={this.state.rows}
          rawData={this.state.rowsRaw}
          title={this.props.exportTitle}
        />
      ]
    };
    return (
      <EuiInMemoryTable
        data-test-subj="inspectorTable"
        columns={columns}
        items={rows}
        sorting={true}
        pagination={true}
        search={search}
        compressed={true}
      />
    );
  }
}

DataTableFormat.propTypes = {
  data: PropTypes.object.isRequired,
  exportTitle: PropTypes.string.isRequired,
};

export { DataTableFormat };

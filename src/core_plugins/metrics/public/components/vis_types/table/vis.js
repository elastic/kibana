import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ticFormatter from '../../lib/tick_formatter';
import calculateLabel from '../../../../common/calculate_label';
import replaceVars from '../../lib/replace_vars';

const STATE_KEY = 'table.sort';

import {
  Pager,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

function getColor(rules, colorKey, value) {
  let color;
  if (rules) {
    rules.forEach(rule => {
      if (rule.opperator && rule.value != null) {
        if (_[rule.opperator](value, rule.value)) {
          color = rule[colorKey];
        }
      }
    });
  }
  return color;
}

class TableVis extends Component {
  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
    this.state = {
      itemsPerPage: 10,
      sort: props.uiState.get(STATE_KEY, {
        column: '_default_',
        order: 'asc',
      }),
    };
    const { visData } = props;
    this.pager = new Pager(
      (visData.series && visData.series.length) || 0,
      this.state.itemsPerPage
    );
    this.state.firstItemIndex = this.pager.getFirstItemIndex();
    this.state.lastItemIndex = this.pager.getLastItemIndex();
  }

  onChangeItemsPerPage = itemsPerPage => {
    this.pager.setItemsPerPage(itemsPerPage);
    this.setState({
      itemsPerPage,
      firstItemIndex: this.pager.getFirstItemIndex(),
      lastItemIndex: this.pager.getLastItemIndex(),
    });
  };

  onChangePage = pageIndex => {
    this.pager.goToPageIndex(pageIndex);
    this.setState({
      firstItemIndex: this.pager.getFirstItemIndex(),
      lastItemIndex: this.pager.getLastItemIndex(),
    });
  };

  renderRow(row) {
    const { model } = this.props;
    const rowId = row.key;
    let rowDisplay = rowId;
    if (model.drilldown_url) {
      const url = replaceVars(model.drilldown_url, {}, { key: row.key });
      rowDisplay = <a href={url}>{rowDisplay}</a>;
    }
    const columns = row.series.filter(item => item).map(item => {
      const column = model.series.find(c => c.id === item.id);
      if (!column) return null;
      const formatter = ticFormatter(column.formatter, column.value_template);
      const value = formatter(item.last);
      let trend;
      if (column.trend_arrows) {
        const trendClass =
          item.slope > 0 ? 'fa-long-arrow-up' : 'fa-long-arrow-down';
        trend = (
          <span className="tsvb-table__trend">
            <i className={`fa ${trendClass}`} />
          </span>
        );
      }
      const style = { color: getColor(column.color_rules, 'text', item.last) };
      return (
        <EuiTableRowCell
          key={`${rowId}-${item.id}`}
          textOnly={false}
          align="right"
        >
          <span style={style} className="tsvb-table__value-display">
            {value}
          </span>
          {trend}
        </EuiTableRowCell>
      );
    });
    return (
      <EuiTableRow key={rowId}>
        <EuiTableRowCell textOnly={false} align="left">
          {rowDisplay}
        </EuiTableRowCell>
        {columns}
      </EuiTableRow>
    );
  }

  renderHeader() {
    const { model, onUiState } = this.props;
    const { sort } = this.state;
    const columns = model.series.map(item => {
      const metric = _.last(item.metrics);
      const label = item.label || calculateLabel(metric, item.metrics);
      const handleClick = () => {
        let order = sort.order;
        if (sort.column === item.id) {
          order = sort.order === 'asc' ? 'desc' : 'asc';
        }
        const nextSort = { column: item.id, order };
        this.setState({ sort: nextSort }, () => {
          onUiState(STATE_KEY, nextSort);
        });
      };
      const isSortAscending = sort.order === 'asc';
      return (
        <EuiTableHeaderCell
          key={item.id}
          align="right"
          onSort={handleClick}
          isSorted={sort.column === item.id}
          isSortAscending={isSortAscending}
        >
          {label}
        </EuiTableHeaderCell>
      );
    });

    const label = model.pivot_label || model.pivot_field || model.pivot_id;
    const isSortAscending = sort.order === 'asc';
    const handleSortClick = () => {
      let order = sort.order;
      if (sort.column === '_default_') {
        order = sort.order === 'asc' ? 'desc' : 'asc';
      }
      const nextSort = { column: '_default_', order };
      this.setState({ sort: nextSort }, () => {
        onUiState(STATE_KEY, nextSort);
      });
    };

    return (
      <EuiTableHeader>
        <EuiTableHeaderCell
          align="left"
          onSort={handleSortClick}
          isSorted={sort.column === '_default_'}
          isSortAscending={isSortAscending}
        >
          {label}
        </EuiTableHeaderCell>
        {columns}
      </EuiTableHeader>
    );
  }

  sortIdentity = item => {
    const { sort } = this.state;
    if (sort.column === '_default_') return item.key;
    const column = item.series.find(i => i.id === sort.column);
    if (column) return column.last;
  };

  render() {
    const { visData, model } = this.props;
    const { firstItemIndex, lastItemIndex, itemsPerPage } = this.state;
    const header = this.renderHeader();

    let rows;
    if (_.isArray(visData.series) && visData.series.length) {
      const series =
        this.state.sort.order === 'asc'
          ? _.sortBy(visData.series, this.sortIdentity)
          : _.sortBy(visData.series, this.sortIdentity).reverse();
      rows = series.slice(firstItemIndex, lastItemIndex).map(this.renderRow);
    } else {
      let message = 'No results available.';
      if (!model.pivot_id) {
        message += ' You must choose a group by field for this visualization.';
      }
      rows = (
        <EuiTableRow colSpan={model.series.length + 1}>
          <EuiTableRowCell>{message}</EuiTableRowCell>
        </EuiTableRow>
      );
    }
    return (
      <div className="dashboard__tableVisualization" data-test-subj="tableView">
        <EuiTable>
          {header}
          <EuiTableBody>{rows}</EuiTableBody>
        </EuiTable>
        <EuiSpacer size="m" />
        {itemsPerPage < visData.series.length && (
          <EuiTablePagination
            activePage={this.pager.getCurrentPageIndex()}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[5, 10, 20]}
            pageCount={this.pager.getTotalPages()}
            onChangeItemsPerPage={this.onChangeItemsPerPage}
            onChangePage={this.onChangePage}
          />
        ) || null}
      </div>
    );
  }
}

TableVis.defaultProps = {
  sort: {},
};

TableVis.propTypes = {
  visData: PropTypes.object,
  model: PropTypes.object,
  backgroundColor: PropTypes.string,
  onPaginate: PropTypes.func,
  onUiState: PropTypes.func,
  uiState: PropTypes.object,
  pageNumber: PropTypes.number,
  reversed: PropTypes.bool,
};

export default TableVis;

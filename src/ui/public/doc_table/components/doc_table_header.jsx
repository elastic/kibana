import React, { Component, PropTypes } from 'react';
import _ from 'lodash';

export default class DocTableHeader extends Component {
  static propTypes = {
    columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    sorting: PropTypes.shape([
      PropTypes.string,
      PropTypes.string
    ]),
    indexPattern: PropTypes.shape({
      timeFieldName: PropTypes.string,
      fields: PropTypes.object.isRequired
    }),
    moveColLeft: PropTypes.func.isRequired,
    moveColRight: PropTypes.func.isRequired,
    toggleCol: PropTypes.func.isRequired,
    sortByCol: PropTypes.func.isRequired,
    helpers: PropTypes.shape({
      isColSortable: PropTypes.func.isRequired,
      isColRemovable: PropTypes.func.isRequired,
      shortDotsFilter: PropTypes.func.isRequired,
    }),
  };

  getHeaderClass(column) {
    if (!this.props.helpers.isColSortable(column)) return;

    const { sorting } = this.props;

    if (!sorting || column !== sorting[0]) {
      return ['fa', 'fa-sort-up', 'table-header-sortchange'];
    } else {
      return ['fa', sorting[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
    }
  }

  getCellTooltip(column) {
    if (!this.props.helpers.isColSortable(column)) return '';
    return 'Sort by ' + this.props.helpers.shortDotsFilter(column);
  }

  render() {
    const {
      columns,
      moveColLeft,
      moveColRight,
      indexPattern,
      sortByCol,
      toggleCol,
      helpers: {
        isColRemovable,
        shortDotsFilter,
      },
    } = this.props;
    const timeCol = indexPattern && indexPattern.timeFieldName;

    return (
      <thead>
        <tr>
          <th width="1%"></th>
          {
            timeCol && (
              <th>
                <span>
                  Time <i
                    className={this.getHeaderClass(timeCol)}
                    onClick={() => this.sortByCol(timeCol)}
                    tooltip="Sort by time"
                  />
                </span>
              </th>
            )
          }
          {
            columns.map((name, i) => (
              <th key={name}>
                <span className="table-header-name">
                  {shortDotsFilter(name) + ' '}
                  <i
                    className={this.getHeaderClass(name)}
                    onClick={() => sortByCol(name)}
                    tooltip="{{tooltip(name)}}"
                    tooltip-append-to-body="1"
                  />
                </span>
                <span className="table-header-move">
                  {
                    isColRemovable(name) && <i
                      onClick={() => toggleCol(name)}
                      className="fa fa-remove"
                      tooltip="Remove column"
                      tooltip-append-to-body="1"
                    />
                  }
                  {
                    (i !== 0) && <i
                      onClick={() => moveColLeft(name)}
                      className="fa fa-angle-double-left"
                      tooltip="Move column to the left"
                      tooltip-append-to-body="1"
                    />
                  }
                  {
                    (i !== columns.length - 1) && <i
                      onClick={() => moveColRight(name)}
                      className="fa fa-angle-double-right"
                      tooltip="Move column to the right"
                      tooltip-append-to-body="1"
                    />
                  }
                </span>
              </th>
            ))
          }
        </tr>
      </thead>
    );
  }
};

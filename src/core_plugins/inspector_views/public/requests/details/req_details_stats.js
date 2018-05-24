import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiIcon,
  EuiIconTip,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

class RequestDetailsStats extends Component {

  static shouldShow = (request) => !!request.stats && Object.keys(request.stats).length;

  renderStatRow = (stat) => {
    return [
      <EuiTableRow
        key={stat.name}
      >
        <EuiTableRowCell>
          <span className="requests-stats__icon">
            { stat.description &&
              <EuiIconTip
                aria-label="Description"
                type="questionInCircle"
                color="subdued"
                content={stat.description}
              />
            }
            { !stat.description &&
              <EuiIcon
                type="empty"
              />
            }
          </span>
          {stat.name}
        </EuiTableRowCell>
        <EuiTableRowCell>{stat.value}</EuiTableRowCell>
      </EuiTableRow>
    ];
  };

  render() {
    const { stats } = this.props.request;
    const sortedStats = Object.keys(stats).sort().map(name => ({ name, ...stats[name] }));
    // TODO: Replace by property once available
    return (
      <EuiTable style={{ tableLayout: 'auto' }}>
        <EuiTableBody>
          { sortedStats.map(this.renderStatRow) }
        </EuiTableBody>
      </EuiTable>
    );
  }
}

RequestDetailsStats.propTypes = {
  request: PropTypes.object.isRequired,
};

export { RequestDetailsStats };

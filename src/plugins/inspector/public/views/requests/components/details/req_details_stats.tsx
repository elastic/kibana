/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
import { i18n } from '@kbn/i18n';
import { Request, RequestStatistic } from '../../../../../common/adapters/request/types';
import { RequestDetailsProps } from '../types';

// TODO: Replace by property once available
interface RequestDetailsStatRow extends RequestStatistic {
  id: string;
}

export class RequestDetailsStats extends Component<RequestDetailsProps> {
  static propTypes = {
    request: PropTypes.object.isRequired,
  };

  static shouldShow = (request: Request) =>
    Boolean(request.stats && Object.keys(request.stats).length);

  renderStatRow = (stat: RequestDetailsStatRow) => {
    return [
      <EuiTableRow key={stat.id}>
        <EuiTableRowCell>
          <span className="insRequestDetailsStats__icon">
            {stat.description ? (
              <EuiIconTip
                aria-label={i18n.translate('inspector.requests.descriptionRowIconAriaLabel', {
                  defaultMessage: 'Description',
                })}
                type="questionInCircle"
                color="subdued"
                content={stat.description}
              />
            ) : (
              <EuiIcon type="empty" />
            )}
          </span>
          {stat.label}
        </EuiTableRowCell>
        <EuiTableRowCell>{stat.value}</EuiTableRowCell>
      </EuiTableRow>,
    ];
  };

  render() {
    const { stats } = this.props.request;

    if (!stats) {
      return null;
    }

    const sortedStats = Object.keys(stats)
      .sort()
      .map((id) => ({ id, ...stats[id] } as RequestDetailsStatRow));

    return (
      <EuiTable responsive={false}>
        <EuiTableBody>{sortedStats.map(this.renderStatRow)}</EuiTableBody>
      </EuiTable>
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component } from 'react';
import { css } from '@emotion/react';
import {
  EuiIcon,
  EuiIconTip,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DetailViewProps } from './types';
import { Request, RequestStatistic } from '../../../../../common/adapters/request/types';

// TODO: Replace by property once available
interface RequestDetailsStatRow extends RequestStatistic {
  id: string;
}

const StatRow = ({ stat }: { stat: RequestDetailsStatRow }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiTableRow>
      <EuiTableRowCell>
        {stat.label}

        <span css={css({ marginLeft: euiTheme.size.xs })}>
          {stat.description ? (
            <EuiIconTip
              aria-label={i18n.translate('inspector.requests.descriptionRowIconAriaLabel', {
                defaultMessage: 'Description',
              })}
              type="question"
              color="subdued"
              content={stat.description}
            />
          ) : (
            <EuiIcon type="empty" />
          )}
        </span>
      </EuiTableRowCell>
      <EuiTableRowCell>{stat.value}</EuiTableRowCell>
    </EuiTableRow>
  );
};

export class RequestDetailsStats extends Component<DetailViewProps> {
  static shouldShow = (request: Request) =>
    Boolean(request.stats && Object.keys(request.stats).length);

  render() {
    const { stats } = this.props.request;

    if (!stats) {
      return null;
    }

    const sortedStats = Object.keys(stats)
      .sort()
      .map((id) => ({ id, ...stats[id] } as RequestDetailsStatRow));

    return (
      <EuiTable responsiveBreakpoint={false}>
        <EuiTableBody>
          {sortedStats.map((stat) => (
            <StatRow stat={stat} key={stat.id} />
          ))}
        </EuiTableBody>
      </EuiTable>
    );
  }
}

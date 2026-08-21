/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DetailViewProps } from './types';
import type { InspectorKibanaServices } from '../types';
import type { Request, RequestStatistic } from '../../../../../common/adapters/request/types';

// TODO: Replace by property once available
interface RequestDetailsStatRow extends RequestStatistic {
  id: string;
}

const StatRow = ({ stat, href }: { stat: RequestDetailsStatRow; href?: string }) => {
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
            <EuiIcon type="empty" aria-hidden={true} />
          )}
        </span>
      </EuiTableRowCell>
      <EuiTableRowCell data-test-subj={`inspector.statistics.${stat.id}`}>
        {href ? (
          <EuiLink target="_blank" href={href}>
            {stat.value}
          </EuiLink>
        ) : (
          stat.value
        )}
      </EuiTableRowCell>
    </EuiTableRow>
  );
};

export const RequestDetailsStats = ({ request }: DetailViewProps) => {
  const { stats } = request;
  const { services } = useKibana<InspectorKibanaServices>();
  if (!stats) return null;

  const dataViewId = stats?.indexPatternId?.value;
  const dataViewHref = dataViewId
    ? services.application.getUrlForApp('management', {
        path: `kibana/dataViews/dataView/${encodeURIComponent(dataViewId)}`,
      })
    : undefined;

  const sortedStats: RequestDetailsStatRow[] = Object.keys(stats)
    .sort()
    .map((id) => ({ id, ...stats[id] }));

  return (
    <EuiTable responsiveBreakpoint={false}>
      <EuiTableBody>
        {sortedStats.map((stat) => (
          <StatRow
            stat={stat}
            key={stat.id}
            href={stat.id === 'indexPattern' ? dataViewHref : undefined}
          />
        ))}
      </EuiTableBody>
    </EuiTable>
  );
};

RequestDetailsStats.shouldShow = (request: Request) =>
  Boolean(request.stats && Object.keys(request.stats).length);

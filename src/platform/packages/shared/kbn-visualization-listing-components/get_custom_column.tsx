/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBetaBadge, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { VisualizationListItem } from './types';

const getBadge = (item: VisualizationListItem) => {
  if (item.stage === 'beta') {
    return (
      <EuiBetaBadge
        className="visListingTable__betaIcon"
        label="B"
        title={i18n.translate('visualizations.listing.betaTitle', {
          defaultMessage: 'Beta',
        })}
        tooltipContent={i18n.translate('visualizations.listing.betaTooltip', {
          defaultMessage:
            'This visualization is in beta and is subject to change. The design and code is less mature than official GA ' +
            'features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA ' +
            'features',
        })}
      />
    );
  } else if (item.stage === 'experimental') {
    return (
      <EuiBetaBadge
        className="visListingTable__experimentalIcon"
        label="E"
        title={i18n.translate('visualizations.listing.experimentalTitle', {
          defaultMessage: 'Technical preview',
        })}
        tooltipContent={i18n.translate('visualizations.listing.experimentalTooltip', {
          defaultMessage:
            'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
        })}
      />
    );
  }
};

const renderItemTypeIcon = (item: VisualizationListItem) => {
  if (item.image) {
    return (
      <img className="visListingTable__typeImage" aria-hidden="true" alt="" src={item.image} />
    );
  }

  return (
    <EuiIcon
      className="visListingTable__typeIcon"
      aria-hidden="true"
      type={item.icon || 'empty'}
      size="m"
    />
  );
};

export const getCustomColumn = () => {
  return {
    field: 'typeTitle',
    name: i18n.translate('visualizations.listing.table.typeColumnName', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    width: '150px',
    render: (field: string, record: VisualizationListItem) => {
      if (!record.error) {
        return (
          <span>
            {renderItemTypeIcon(record)}
            {record.typeTitle}
            {getBadge(record)}
          </span>
        );
      }

      if (!record.typeTitle) {
        return (
          <EuiToolTip position="left" content={record.error}>
            <span tabIndex={0}>
              <EuiIcon
                className="visListingTable__typeIcon"
                aria-hidden="true"
                color="warning"
                type="warning"
                size="m"
              />
              <FormattedMessage id="visualizations.listing.type.unknown" defaultMessage="Unknown" />
            </span>
          </EuiToolTip>
        );
      }

      return (
        <EuiToolTip position="left" content={record.error}>
          <span tabIndex={0}>
            <EuiIcon
              className="visListingTable__typeIcon"
              aria-hidden="true"
              color="danger"
              type="error"
              size="m"
            />
            <FormattedMessage id="visualizations.listing.type.error" defaultMessage="Error" />
          </span>
        </EuiToolTip>
      );
    },
  };
};

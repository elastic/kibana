/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBetaBadge, EuiButton, EuiEmptyPrompt, EuiIcon, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { VisualizationListItem } from '../..';

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
  let icon;
  if (item.image) {
    icon = (
      <img className="visListingTable__typeImage" aria-hidden="true" alt="" src={item.image} />
    );
  } else {
    icon = (
      <EuiIcon
        className="visListingTable__typeIcon"
        aria-hidden="true"
        type={item.icon || 'empty'}
        size="m"
      />
    );
  }

  return icon;
};

export const getCustomColumn = () => {
  return {
    field: 'typeTitle',
    name: i18n.translate('visualizations.listing.table.typeColumnName', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    width: '150px',
    render: (field: string, record: VisualizationListItem) =>
      !record.error ? (
        <span>
          {renderItemTypeIcon(record)}
          {record.typeTitle}
          {getBadge(record)}
        </span>
      ) : (
        <EuiBadge iconType="warning" color="warning">
          {record.error}
        </EuiBadge>
      ),
  };
};

export const getNoItemsMessage = (createItem: () => void) => (
  <EuiEmptyPrompt
    iconType="visualizeApp"
    title={
      <h1 id="visualizeListingHeading" data-test-subj="emptyListPrompt">
        <FormattedMessage
          id="visualizations.listing.createNew.title"
          defaultMessage="Create your first visualization"
        />
      </h1>
    }
    body={
      <p>
        <FormattedMessage
          id="visualizations.listing.createNew.description"
          defaultMessage="You can create different visualizations based on your data."
        />
      </p>
    }
    actions={
      <EuiButton onClick={createItem} fill iconType="plusInCircle" data-test-subj="newItemButton">
        <FormattedMessage
          id="visualizations.listing.createNew.createButtonLabel"
          defaultMessage="Create new visualization"
        />
      </EuiButton>
    }
  />
);

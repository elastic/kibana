/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { History } from 'history';
import { EuiBetaBadge, EuiButton, EuiEmptyPrompt, EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ApplicationStart } from 'kibana/public';
import { VisualizationListItem } from 'src/plugins/visualizations/public';

const getBadge = (item: VisualizationListItem) => {
  if (item.stage === 'beta') {
    return (
      <EuiBetaBadge
        className="visListingTable__betaIcon"
        label="B"
        title={i18n.translate('visualize.listing.betaTitle', {
          defaultMessage: 'Beta',
        })}
        tooltipContent={i18n.translate('visualize.listing.betaTooltip', {
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
        title={i18n.translate('visualize.listing.experimentalTitle', {
          defaultMessage: 'Experimental',
        })}
        tooltipContent={i18n.translate('visualize.listing.experimentalTooltip', {
          defaultMessage:
            'This visualization might be changed or removed in a future release and is not subject to the support SLA.',
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

export const getTableColumns = (application: ApplicationStart, history: History) => [
  {
    field: 'title',
    name: i18n.translate('visualize.listing.table.titleColumnName', {
      defaultMessage: 'Title',
    }),
    sortable: true,
    render: (field: string, { editApp, editUrl, title }: VisualizationListItem) => (
      <EuiLink
        onClick={() => {
          if (editApp) {
            application.navigateToApp(editApp, { path: editUrl });
          } else if (editUrl) {
            history.push(editUrl);
          }
        }}
        data-test-subj={`visListingTitleLink-${title.split(' ').join('-')}`}
      >
        {field}
      </EuiLink>
    ),
  },
  {
    field: 'typeTitle',
    name: i18n.translate('visualize.listing.table.typeColumnName', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    render: (field: string, record: VisualizationListItem) => (
      <span>
        {renderItemTypeIcon(record)}
        {record.typeTitle}
        {getBadge(record)}
      </span>
    ),
  },
  {
    field: 'description',
    name: i18n.translate('visualize.listing.table.descriptionColumnName', {
      defaultMessage: 'Description',
    }),
    sortable: true,
    render: (field: string, record: VisualizationListItem) => <span>{record.description}</span>,
  },
];

export const getNoItemsMessage = (createItem: () => void) => (
  <EuiEmptyPrompt
    iconType="visualizeApp"
    title={
      <h1 id="visualizeListingHeading">
        <FormattedMessage
          id="visualize.listing.createNew.title"
          defaultMessage="Create your first visualization"
        />
      </h1>
    }
    body={
      <p>
        <FormattedMessage
          id="visualize.listing.createNew.description"
          defaultMessage="You can create different visualizations based on your data."
        />
      </p>
    }
    actions={
      <EuiButton
        onClick={createItem}
        fill
        iconType="plusInCircle"
        data-test-subj="createVisualizationPromptButton"
      >
        <FormattedMessage
          id="visualize.listing.createNew.createButtonLabel"
          defaultMessage="Create new visualization"
        />
      </EuiButton>
    }
  />
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  EuiBetaBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLink,
  EuiBadge,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ApplicationStart } from 'kibana/public';
import { IKbnUrlStateStorage } from 'src/plugins/kibana_utils/public';
import { VisualizationListItem } from 'src/plugins/visualizations/public';
import type { SavedObjectsTaggingApi } from 'src/plugins/saved_objects_tagging_oss/public';
/** @deprecated Use `RedirectAppLinks` from `@kbn/shared-ux-components */
import { RedirectAppLinks } from '../../../../kibana_react/public';
import { getVisualizeListItemLink } from './get_visualize_list_item_link';
import { getUsageCollector } from '../../services';
import { VISUALIZE_APP_NAME } from '../../../common/constants';

const doTelemetryForAddEvent = (visType?: string) => {
  const usageCollection = getUsageCollector();

  if (usageCollection && visType) {
    usageCollection.reportUiCounter(VISUALIZE_APP_NAME, METRIC_TYPE.CLICK, `${visType}:add`);
  }
};

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
            'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
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

export const getTableColumns = (
  application: ApplicationStart,
  kbnUrlStateStorage: IKbnUrlStateStorage,
  taggingApi?: SavedObjectsTaggingApi
) =>
  [
    {
      field: 'title',
      name: i18n.translate('visualizations.listing.table.titleColumnName', {
        defaultMessage: 'Title',
      }),
      sortable: true,
      render: (field: string, { editApp, editUrl, title, error, type }: VisualizationListItem) =>
        // In case an error occurs i.e. the vis has wrong type, we render the vis but without the link
        !error ? (
          <RedirectAppLinks application={application} className="visListingTable__titleLink">
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiLink
              href={getVisualizeListItemLink(application, kbnUrlStateStorage, editApp, editUrl)}
              onClick={() => {
                doTelemetryForAddEvent(typeof type === 'string' ? type : type?.name);
              }}
              data-test-subj={`visListingTitleLink-${title.split(' ').join('-')}`}
            >
              {field}
            </EuiLink>
          </RedirectAppLinks>
        ) : (
          field
        ),
    },
    {
      field: 'typeTitle',
      name: i18n.translate('visualizations.listing.table.typeColumnName', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      render: (field: string, record: VisualizationListItem) =>
        !record.error ? (
          <span>
            {renderItemTypeIcon(record)}
            {record.typeTitle}
            {getBadge(record)}
          </span>
        ) : (
          <EuiBadge iconType="alert" color="warning">
            {record.error}
          </EuiBadge>
        ),
    },
    {
      field: 'description',
      name: i18n.translate('visualizations.listing.table.descriptionColumnName', {
        defaultMessage: 'Description',
      }),
      sortable: true,
      render: (field: string, record: VisualizationListItem) => <span>{record.description}</span>,
    },
    ...(taggingApi ? [taggingApi.ui.getTableColumnDefinition()] : []),
  ] as unknown as Array<EuiBasicTableColumn<Record<string, unknown>>>;

export const getNoItemsMessage = (createItem: () => void) => (
  <EuiEmptyPrompt
    iconType="visualizeApp"
    title={
      <h1 id="visualizeListingHeading">
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
      <EuiButton
        onClick={createItem}
        fill
        iconType="plusInCircle"
        data-test-subj="createVisualizationPromptButton"
      >
        <FormattedMessage
          id="visualizations.listing.createNew.createButtonLabel"
          defaultMessage="Create new visualization"
        />
      </EuiButton>
    }
  />
);

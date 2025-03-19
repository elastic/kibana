/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { sortBy } from 'lodash';
import {
  EuiButton,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { SampleDataSet } from '@kbn/home-sample-data-types';
import { useServices } from '../services';

/**
 * Props for the `ViewButton` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name' | 'overviewDashboard' | 'appLinks'>;

const viewDataButtonLabel = i18n.translate('homePackages.sampleDataCard.viewDataButtonLabel', {
  defaultMessage: 'View data',
});

const dashboardLabel = i18n.translate('homePackages.sampleDataCard.dashboardLinkLabel', {
  defaultMessage: 'Dashboard',
});

/**
 * A button displayed when a Sample Data Set is installed, allowing a person to view the overview dashboard,
 * and, if included, a number of actions to navigate to other solutions.
 */
export const ViewButton = ({ id, name, overviewDashboard, appLinks }: Props) => {
  const { addBasePath, getAppNavigationHandler } = useServices();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const viewDataButtonAriaLabel = i18n.translate(
    'homePackages.sampleDataCard.viewDataButtonAriaLabel',
    {
      defaultMessage: 'View {datasetName}',
      values: {
        datasetName: name,
      },
    }
  );

  const dashboardPath = `/app/dashboards#/view/${overviewDashboard}`;

  if (appLinks.length === 0) {
    return (
      <EuiButton
        onClick={getAppNavigationHandler(dashboardPath)}
        data-test-subj={`launchSampleDataSet${id}`}
        aria-label={viewDataButtonAriaLabel}
      >
        {viewDataButtonLabel}
      </EuiButton>
    );
  }

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const dashboardAppLink = {
    path: dashboardPath,
    label: dashboardLabel,
    icon: 'dashboardApp',
    order: 0,
    'data-test-subj': `viewSampleDataSet${id}-dashboard`,
  };

  const sortedItems = sortBy([dashboardAppLink, ...appLinks], 'order');
  const items = sortedItems.map(({ path, label, icon, ...rest }) => {
    return {
      name: label,
      icon: <EuiIcon type={icon} size="m" />,
      href: addBasePath(path),
      onClick: getAppNavigationHandler(path),
      ...(rest['data-test-subj'] ? { 'data-test-subj': rest['data-test-subj'] } : {}),
    };
  });

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items,
    },
  ];

  const popoverButton = (
    <EuiButton
      aria-label={viewDataButtonAriaLabel}
      onClick={togglePopover}
      iconType="arrowDown"
      iconSide="right"
    >
      {viewDataButtonLabel}
    </EuiButton>
  );

  return (
    <EuiPopover
      id={`sampleDataLinks${id}`}
      button={popoverButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      data-test-subj={`launchSampleDataSet${id}`}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};

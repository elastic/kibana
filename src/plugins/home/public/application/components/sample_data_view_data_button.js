/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton, EuiContextMenu, EuiIcon, EuiPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { getServices } from '../kibana_services';
import { createAppNavigationHandler } from './app_navigation_handler';

export class SampleDataViewDataButton extends React.Component {
  addBasePath = getServices().addBasePath;

  state = {
    isPopoverOpen: false,
  };

  togglePopoverVisibility = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const viewDataButtonLabel = i18n.translate('home.sampleDataSetCard.viewDataButtonLabel', {
      defaultMessage: 'View data',
    });
    const viewDataButtonAriaLabel = i18n.translate(
      'home.sampleDataSetCard.viewDataButtonAriaLabel',
      {
        defaultMessage: 'View {datasetName}',
        values: {
          datasetName: this.props.name,
        },
      }
    );
    const dashboardPath = `/app/dashboards#/view/${this.props.overviewDashboard}`;
    const prefixedDashboardPath = this.addBasePath(dashboardPath);

    if (this.props.appLinks.length === 0) {
      return (
        <EuiButton
          onClick={createAppNavigationHandler(dashboardPath)}
          data-test-subj={`launchSampleDataSet${this.props.id}`}
          aria-label={viewDataButtonAriaLabel}
        >
          {viewDataButtonLabel}
        </EuiButton>
      );
    }

    const additionalItems = this.props.appLinks.map(({ path, label, icon }) => {
      return {
        name: label,
        icon: <EuiIcon type={icon} size="m" />,
        href: this.addBasePath(path),
        onClick: createAppNavigationHandler(path),
      };
    });

    /** @typedef {import('@elastic/eui').EuiContextMenuProps['panels']} EuiContextMenuPanels */
    /** @type {EuiContextMenuPanels} */
    const panels = [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('home.sampleDataSetCard.dashboardLinkLabel', {
              defaultMessage: 'Dashboard',
            }),
            icon: <EuiIcon type="dashboardApp" size="m" />,
            href: prefixedDashboardPath,
            onClick: createAppNavigationHandler(dashboardPath),
            'data-test-subj': `viewSampleDataSet${this.props.id}-dashboard`,
          },
          ...additionalItems,
        ],
      },
    ];
    const popoverButton = (
      <EuiButton
        aria-label={viewDataButtonAriaLabel}
        onClick={this.togglePopoverVisibility}
        iconType="arrowDown"
        iconSide="right"
      >
        {viewDataButtonLabel}
      </EuiButton>
    );
    return (
      <EuiPopover
        id={`sampleDataLinks${this.props.id}`}
        button={popoverButton}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        data-test-subj={`launchSampleDataSet${this.props.id}`}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    );
  }
}

SampleDataViewDataButton.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  overviewDashboard: PropTypes.string.isRequired,
  appLinks: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
    })
  ).isRequired,
};

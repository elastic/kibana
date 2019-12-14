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
import PropTypes from 'prop-types';
import { EuiButton, EuiContextMenu, EuiIcon, EuiPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';

export class SampleDataViewDataButton extends React.Component {
  state = {
    isPopoverOpen: false,
  };

  togglePopoverVisibility = () => {
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    const viewDataButtonLabel = i18n.translate('kbn.home.sampleDataSetCard.viewDataButtonLabel', {
      defaultMessage: 'View data',
    });
    const viewDataButtonAriaLabel = i18n.translate(
      'kbn.home.sampleDataSetCard.viewDataButtonAriaLabel',
      {
        defaultMessage: 'View {datasetName}',
        values: {
          datasetName: this.props.name,
        },
      }
    );
    const dashboardPath = chrome.addBasePath(
      `/app/kibana#/dashboard/${this.props.overviewDashboard}`
    );

    if (this.props.appLinks.length === 0) {
      return (
        <EuiButton
          href={dashboardPath}
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
        href: chrome.addBasePath(path),
      };
    });
    const panels = [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('kbn.home.sampleDataSetCard.dashboardLinkLabel', {
              defaultMessage: 'Dashboard',
            }),
            icon: <EuiIcon type="dashboardApp" size="m" />,
            href: dashboardPath,
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

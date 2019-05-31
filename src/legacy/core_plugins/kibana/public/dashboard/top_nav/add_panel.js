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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { capabilities } from 'ui/capabilities';
import { toastNotifications } from 'ui/notify';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiButton,
  EuiTitle,
} from '@elastic/eui';

export class DashboardAddPanel extends React.Component {
  onAddPanel = (id, type, name) => {
    this.props.addNewPanel(id, type);

    // To avoid the clutter of having toast messages cover flyout
    // close previous toast message before creating a new one
    if (this.lastToast) {
      toastNotifications.remove(this.lastToast);
    }

    this.lastToast = toastNotifications.addSuccess({
      title: i18n.translate(
        'kbn.dashboard.topNav.addPanel.savedObjectAddedToDashboardSuccessMessageTitle',
        {
          defaultMessage: '{savedObjectName} was added to your dashboard',
          values: {
            savedObjectName: name,
          },
        }
      ),
      'data-test-subj': 'addObjectToDashboardSuccess',
    });
  };

  render() {
    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardAddPanel">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="kbn.dashboard.topNav.addPanelsTitle"
                defaultMessage="Add panels"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SavedObjectFinder
            onChoose={this.onAddPanel}
            savedObjectMetaData={this.props.embeddableFactories
              .filter(embeddableFactory => Boolean(embeddableFactory.savedObjectMetaData))
              .map(({ savedObjectMetaData }) => savedObjectMetaData)}
            showFilter={true}
            noItemsMessage={i18n.translate(
              'kbn.dashboard.topNav.addPanel.noMatchingObjectsMessage',
              {
                defaultMessage: 'No matching objects found.',
              }
            )}
          />
        </EuiFlyoutBody>
        { capabilities.get().visualize.save ? (
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={this.props.addNewVis} data-test-subj="addNewSavedObjectLink">
                  <FormattedMessage
                    id="kbn.dashboard.topNav.addPanel.createNewVisualizationButtonLabel"
                    defaultMessage="Create new visualization"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        ) : null }
      </EuiFlyout>
    );
  }
}

DashboardAddPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  addNewPanel: PropTypes.func.isRequired,
  addNewVis: PropTypes.func.isRequired,
};

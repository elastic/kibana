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
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';
import rison from 'rison-node';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiSpacer,
  EuiFlyout,
  EuiFlyoutBody,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';

const SEARCH_OBJECT_TYPE = 'search';

export class OpenSearchPanel extends React.Component {

  renderMangageSearchesButton() {
    return (
      <EuiButton
        onClick={this.props.onClose}
        href={`#/management/kibana/objects?_a=${rison.encode({ tab: SEARCH_OBJECT_TYPE })}`}
      >
        <FormattedMessage
          id="kbn.discover.topNav.openSearchPanel.manageSearchesButtonLabel"
          defaultMessage="Manage searches"
        />
      </EuiButton>
    );
  }

  render() {
    return (
      <EuiFlyout
        ownFocus
        onClose={this.props.onClose}
        data-test-subj="loadSearchForm"
      >
        <EuiFlyoutBody>

          <EuiTitle size="s">
            <h1>
              <FormattedMessage
                id="kbn.discover.topNav.openSearchPanel.openSearchTitle"
                defaultMessage="Open Search"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="m" />

          <SavedObjectFinder
            noItemsMessage={
              <FormattedMessage
                id="kbn.discover.topNav.openSearchPanel.noSearchesFoundDescription"
                defaultMessage="No matching searches found."
              />
            }
            savedObjectType={SEARCH_OBJECT_TYPE}
            makeUrl={this.props.makeUrl}
            onChoose={this.props.onClose}
            callToActionButton={this.renderMangageSearchesButton()}
          />

        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}

OpenSearchPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  makeUrl: PropTypes.func.isRequired,
};

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
import rison from 'rison-node';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiTitle,
} from '@elastic/eui';
import { SavedObjectFinderUi } from '../../../../../saved_objects/public';
import { getServices } from '../../../kibana_services';

const SEARCH_OBJECT_TYPE = 'search';

export function OpenSearchPanel(props) {
  const {
    core: { uiSettings, savedObjects },
    addBasePath,
  } = getServices();

  return (
    <EuiFlyout ownFocus onClose={props.onClose} data-test-subj="loadSearchForm">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="discover.topNav.openSearchPanel.openSearchTitle"
              defaultMessage="Open search"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinderUi
          noItemsMessage={
            <FormattedMessage
              id="discover.topNav.openSearchPanel.noSearchesFoundDescription"
              defaultMessage="No matching searches found."
            />
          }
          savedObjectMetaData={[
            {
              type: SEARCH_OBJECT_TYPE,
              getIconForSavedObject: () => 'search',
              name: i18n.translate('discover.savedSearch.savedObjectName', {
                defaultMessage: 'Saved search',
              }),
            },
          ]}
          onChoose={(id) => {
            window.location.assign(props.makeUrl(id));
            props.onClose();
          }}
          uiSettings={uiSettings}
          savedObjects={savedObjects}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButton
              fill
              onClick={props.onClose}
              href={addBasePath(
                `/app/management/kibana/objects?_a=${rison.encode({ tab: SEARCH_OBJECT_TYPE })}`
              )}
            >
              <FormattedMessage
                id="discover.topNav.openSearchPanel.manageSearchesButtonLabel"
                defaultMessage="Manage searches"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

OpenSearchPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  makeUrl: PropTypes.func.isRequired,
};

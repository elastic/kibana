/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { SavedSearchType, SavedSearchTypeDisplayName } from '@kbn/saved-search-plugin/common';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

interface OpenSearchPanelProps {
  onClose: () => void;
  onOpenSavedSearch: (id: string) => void;
}

export function OpenSearchPanel(props: OpenSearchPanelProps) {
  const { addBasePath, capabilities, savedObjectsTagging, contentClient, uiSettings } =
    useDiscoverServices();
  const hasSavedObjectPermission =
    capabilities.savedObjectsManagement?.edit || capabilities.savedObjectsManagement?.delete;

  return (
    <EuiFlyout ownFocus onClose={props.onClose} data-test-subj="loadSearchForm">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="discover.topNav.openSearchPanel.openSearchTitle"
              defaultMessage="Open Discover Session"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinder
          id="discoverOpenSearch"
          services={{
            savedObjectsTagging,
            contentClient,
            uiSettings,
          }}
          noItemsMessage={
            <FormattedMessage
              id="discover.topNav.openSearchPanel.noSearchesFoundDescription"
              defaultMessage="No matching Discover Sessions found."
            />
          }
          savedObjectMetaData={[
            {
              type: SavedSearchType,
              getIconForSavedObject: () => 'discoverApp',
              name: i18n.translate('discover.savedSearch.savedObjectName', {
                defaultMessage: 'Discover Session',
              }),
            },
          ]}
          onChoose={(id) => {
            props.onOpenSavedSearch(id);
            props.onClose();
          }}
          showFilter={true}
        />
      </EuiFlyoutBody>
      {hasSavedObjectPermission && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiButton
                fill
                onClick={props.onClose}
                data-test-subj="manageSearchesBtn"
                href={addBasePath(
                  `/app/management/kibana/objects?initialQuery=type:("${SavedSearchTypeDisplayName}")`
                )}
              >
                <FormattedMessage
                  id="discover.topNav.openSearchPanel.manageSearchesButtonLabel"
                  defaultMessage="Manage Discover Sessions"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}

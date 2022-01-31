/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import rison from 'rison-node';
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
import { SavedObjectFinderUi } from '../../../../../../saved_objects/public';
import { useDiscoverServices } from '../../../../utils/use_discover_services';

const SEARCH_OBJECT_TYPE = 'search';

interface OpenSearchPanelProps {
  onClose: () => void;
  onOpenSavedSearch: (id: string) => void;
}

export function OpenSearchPanel(props: OpenSearchPanelProps) {
  const {
    core: { uiSettings, savedObjects },
    addBasePath,
    capabilities,
  } = useDiscoverServices();

  const hasSavedObjectPermission =
    capabilities.savedObjectsManagement?.edit || capabilities.savedObjectsManagement?.delete;

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
              getIconForSavedObject: () => 'discoverApp',
              name: i18n.translate('discover.savedSearch.savedObjectName', {
                defaultMessage: 'Saved search',
              }),
            },
          ]}
          onChoose={(id) => {
            props.onOpenSavedSearch(id);
            props.onClose();
          }}
          uiSettings={uiSettings}
          savedObjects={savedObjects}
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
      )}
    </EuiFlyout>
  );
}

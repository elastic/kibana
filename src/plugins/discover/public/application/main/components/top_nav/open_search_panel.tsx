/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
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
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { PLUGIN_ID } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

const SEARCH_OBJECT_TYPE = 'search';

interface OpenSearchPanelProps {
  onClose: () => void;
  onOpenSavedSearch: (id: string) => void;
}

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export function OpenSearchPanel(props: OpenSearchPanelProps) {
  const { addBasePath, capabilities, savedObjectsTagging, contentClient, spaces, uiSettings } =
    useDiscoverServices();
  const hasSavedObjectPermission =
    capabilities.savedObjectsManagement?.edit || capabilities.savedObjectsManagement?.delete;

  const SpacesContextWrapper = useMemo(
    () => (spaces ? spaces.ui.components.getSpacesContextProvider : getEmptyFunctionComponent),
    [spaces]
  );

  return (
    <SpacesContextWrapper feature={PLUGIN_ID}>
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
          <SavedObjectFinder
            services={{
              savedObjectsTagging,
              contentClient,
              uiSettings,
              spaces,
            }}
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
                    `/app/management/kibana/objects?initialQuery=type:(${SEARCH_OBJECT_TYPE})`
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
    </SpacesContextWrapper>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiTitle,
  useGeneratedHtmlId,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiPanel,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { SavedSearchType, SavedSearchTypeDisplayName } from '@kbn/saved-search-plugin/common';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  ContentInsightsProvider,
  ViewsStats,
  ActivityView,
  ContentInsightsClient,
} from '@kbn/content-management-content-insights-public';
import type { Logger } from '@kbn/logging';

interface OpenSearchPanelProps {
  onClose: () => void;
  onOpenSavedSearch: (id: string) => void;
}

export function OpenSearchPanel(props: OpenSearchPanelProps) {
  const { onClose } = props;
  const { savedObjectsTagging, http, addBasePath, contentClient, uiSettings, capabilities } =
    useDiscoverServices();
  const hasSavedObjectPermission = Boolean(capabilities?.savedObjectsManagement?.read);
  const modalTitleId = useGeneratedHtmlId({ prefix: 'discoverSearchCreationModalTitle' });

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [selectedMeta, setSelectedMeta] = useState<any | undefined>();
  const [loadingMeta, setLoadingMeta] = useState(false);

  const insightsClient = useMemo(() => {
    const loggerAdapter: Logger = {
      get: () => loggerAdapter,
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {},
      log: () => {},
    } as Logger;
    return new ContentInsightsClient({ http, logger: loggerAdapter }, { domainId: 'discover' });
  }, [http]);

  const loadMeta = useCallback(
    async (id: string) => {
      setLoadingMeta(true);
      try {
        const res: any = await contentClient.get({ contentTypeId: SavedSearchType, id });
        const so = res.result?.item ?? res.item ?? res; // defensive
        setSelectedMeta({
          id,
          title: so.attributes?.title,
          createdAt: so.createdAt,
          createdBy: so.createdBy,
          updatedAt: so.updatedAt,
          updatedBy: so.updatedBy,
          managed: so.managed,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load saved search meta', e);
      } finally {
        setLoadingMeta(false);
      }
    },
    [contentClient]
  );

  return (
    <EuiFlyout
      aria-labelledby={modalTitleId}
      ownFocus
  onClose={onClose}
      data-test-subj="loadSearchForm"
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={modalTitleId}>
            <FormattedMessage
              id="discover.topNav.openSearchPanel.openSearchTitle"
              defaultMessage="Open Discover session"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSplitPanel.Outer direction="row" responsive={false} grow={false} css={{ minHeight: 480 }}>
          <EuiSplitPanel.Inner paddingSize="s" grow={true} css={{ width: '55%' }}>
            <SavedObjectFinder
              id="discoverOpenSearch"
              services={{
                savedObjectsTagging,
                contentClient,
                uiSettings,
              }}
              // Disable default choose so clicking title doesn't close flyout
              onChoose={undefined}
              extraColumns={[
                {
                  field: 'id',
                  name: '',
                  width: '40px',
                  align: 'right',
                  'data-test-subj': 'discoverSessionOpenDetailsCol',
                  sortable: false,
                  render: (_: string, item) => {
                    return (
                      <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <EuiButtonIcon
                          iconType="arrowRight"
                          size="s"
                          color={selectedId === item.id ? 'primary' : 'text'}
                          aria-label={i18n.translate('discover.openSession.showDetailsAria', {
                            defaultMessage: 'Show details for {name}',
                            values: { name: item.name || item.title },
                          })}
                          data-test-subj={`discoverSessionShowDetailsBtn-${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedId !== item.id) {
                              setSelectedId(item.id);
                              loadMeta(item.id);
                            }
                          }}
                        />
                      </span>
                    );
                  },
                },
              ]}
              noItemsMessage={
                <FormattedMessage
                  id="discover.topNav.openSearchPanel.noSearchesFoundDescription"
                  defaultMessage="No matching Discover sessions found."
                />
              }
              savedObjectMetaData={[
                {
                  type: SavedSearchType,
                  getIconForSavedObject: () => 'discoverApp',
                  name: i18n.translate('discover.savedSearch.savedObjectName', {
                    defaultMessage: 'Discover session',
                  }),
                },
              ]}
              showFilter={true}
            />
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner paddingSize="s" grow={true} css={{ width: '45%', overflow: 'auto' }}>
            <EuiText size="s" color="subdued">
              <strong>
                <FormattedMessage id="discover.openSession.detailsHeader" defaultMessage="Details" />
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
            {!selectedId && (
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="discover.openSession.noSelection"
                  defaultMessage="Select a session to see activity & views"
                />
              </EuiText>
            )}
            {selectedId && (
              <ContentInsightsProvider contentInsightsClient={insightsClient}>
                {loadingMeta && <EuiSkeletonRectangle height={120} width={'100%'} />}
                {!loadingMeta && selectedMeta && (
                  <>
                    <EuiPanel hasBorder paddingSize="s">
                      <EuiText size="s">
                        <strong>{selectedMeta.title || selectedMeta.id}</strong>
                      </EuiText>
                      <EuiSpacer size="s" />
                      <EuiButton
                        size="s"
                        iconType="folderOpen"
                        data-test-subj="discoverOpenSelectedSessionBtn"
                        onClick={() => {
                          // Track view explicitly when user chooses to open
                          insightsClient.track(selectedMeta.id, 'viewed');
                          props.onOpenSavedSearch(selectedMeta.id);
                          onClose();
                        }}
                      >
                        <FormattedMessage
                          id="discover.openSession.openButtonLabel"
                          defaultMessage="Open session"
                        />
                      </EuiButton>
                    </EuiPanel>
                    <EuiSpacer size="s" />
                    <ActivityView item={selectedMeta} />
                    <EuiSpacer size="s" />
                    <ViewsStats
                      item={{
                        id: selectedMeta.id,
                        updatedAt:
                          selectedMeta.updatedAt ||
                          selectedMeta.createdAt ||
                          new Date().toISOString(),
                        createdAt: selectedMeta.createdAt,
                        createdBy: selectedMeta.createdBy,
                        updatedBy: selectedMeta.updatedBy,
                        managed: selectedMeta.managed,
                        references: [],
                        type: SavedSearchType,
                        attributes: { title: selectedMeta.title || '', description: '' },
                      }}
                    />
                  </>
                )}
              </ContentInsightsProvider>
            )}
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlyoutBody>
  {hasSavedObjectPermission && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiButton
                fill
        onClick={onClose}
                data-test-subj="manageSearchesBtn"
                href={addBasePath(
                  `/app/management/kibana/objects?initialQuery=type:("${SavedSearchTypeDisplayName}")`
                )}
              >
                <FormattedMessage
                  id="discover.topNav.openSearchPanel.manageSearchesButtonLabel"
                  defaultMessage="Manage Discover sessions"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}
}
      </EuiFlyoutBody>

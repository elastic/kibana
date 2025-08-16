/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfilesProvider } from '@kbn/content-management-user-profiles';
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
  EuiSkeletonRectangle,
  EuiPanel,
  EuiCodeBlock,
  EuiTabs,
  EuiTab,
  EuiBadge,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { SavedSearchType, SavedSearchTypeDisplayName } from '@kbn/saved-search-plugin/common';
import {
  FavoriteButton,
  FavoritesClient,
  FavoritesContextProvider,
  useFavorites,
} from '@kbn/content-management-favorites-public';
import { cssFavoriteHoverWithinEuiTableRow } from '@kbn/content-management-favorites-public/src/components/favorite_button';
import { QueryClient as FavoritesQueryClient } from '@tanstack/react-query';
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

interface FavoritesListProps {
  savedObjectsTagging: any;
  contentClient: any;
  uiSettings: any;
  activeTab: 'all' | 'starred';
  setActiveTab: (t: 'all' | 'starred') => void;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  selectedId?: string;
}

const FavoritesList = ({
  savedObjectsTagging,
  contentClient,
  uiSettings,
  activeTab,
  setActiveTab,
  onSelect,
  onOpen,
  selectedId,
}: FavoritesListProps) => {
  const favorites = useFavorites();
  const favoriteIds = favorites.data?.favoriteIds || [];
  const [prevFavoriteIds, setPrevFavoriteIds] = useState<string[]>([]);
  // Preserve last successful favorites to avoid flicker when switching tabs or during refetch
  useEffect(() => {
    if (favoriteIds.length) {
      setPrevFavoriteIds(favoriteIds);
    }
  }, [favoriteIds]);
  const effectiveFavoriteIds = favorites.isLoading && prevFavoriteIds.length
    ? prevFavoriteIds
    : favoriteIds;
  const favoriteCount = favoriteIds.length;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onFocus={(e) => e.stopPropagation()}
      css={(theme: any) => cssFavoriteHoverWithinEuiTableRow(theme.euiTheme)}
    >
      <EuiTabs size="s">
        <EuiTab
          onClick={() => setActiveTab('all')}
          isSelected={activeTab === 'all'}
          data-test-subj="discoverSessionsTabAll"
        >
          {i18n.translate('discover.openSession.tabAll', { defaultMessage: 'All' })}
        </EuiTab>
        <EuiTab
          onClick={() => setActiveTab('starred')}
          isSelected={activeTab === 'starred'}
          data-test-subj="discoverSessionsTabStarred"
        >
          {i18n.translate('discover.openSession.tabStarred', { defaultMessage: 'Starred' })}{' '}
          {!favorites.isLoading && (
            <EuiBadge color={favoriteCount ? 'hollow' : 'default'} data-test-subj="discoverSessionsStarredCount">
              {favoriteCount}
            </EuiBadge>
          )}
        </EuiTab>
      </EuiTabs>
      {/* Gap below tabs to separate from search bar */}
      <div style={{ height: 8 }} />
      <SavedObjectFinder
        key={activeTab}
        id="discoverOpenSearch"
        services={{ savedObjectsTagging, contentClient, uiSettings }}
        onChoose={(id: string) => onOpen(id)}
        extraColumns={[
          {
            field: 'star',
            name: '',
            width: '32px',
            align: 'left',
            sortable: false,
            render: (_: string, item: any) => <FavoriteButton id={item.id} />,
          },
          {
            field: 'details',
            name: '',
            width: '32px',
            align: 'right',
            sortable: false,
            'data-test-subj': 'discoverSessionOpenDetailsCol',
            render: (_: string, item: any) => (
              <EuiButtonIcon
                iconType="controlsVertical"
                size="s"
                color={selectedId === item.id ? 'primary' : 'text'}
                aria-label={i18n.translate('discover.openSession.showDetailsAria', {
                  defaultMessage: 'Show details for {name}',
                  values: { name: item.name || item.title },
                })}
                data-test-subj={`discoverSessionShowDetailsBtn-${item.id}`}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedId !== item.id) onSelect(item.id);
                }}
              />
            ),
          },
        ]}
        noItemsMessage={
          activeTab === 'starred'
            ? favorites.isLoading
              ? null // suppress empty state while loading to prevent flicker
              : (
                  <EuiEmptyPrompt
                    title={
                      <h4>
                        {i18n.translate('discover.openSession.noStarredTitle', {
                          defaultMessage: 'No starred sessions yet',
                        })}
                      </h4>
                    }
                    body={
                      <p>
                        {i18n.translate('discover.openSession.noStarredBody', {
                          defaultMessage:
                            'Star sessions you frequently open to quickly find them here.',
                        })}
                      </p>
                    }
                    data-test-subj="discoverSessionsStarredEmpty"
                  />
                )
            : (
                <FormattedMessage
                  id="discover.topNav.openSearchPanel.noSearchesFoundDescription"
                  defaultMessage="No matching Discover sessions found."
                />
              )
        }
        savedObjectMetaData={[
          {
            type: SavedSearchType,
            getIconForSavedObject: () => 'discoverApp',
            name: i18n.translate('discover.savedSearch.savedObjectName', {
              defaultMessage: 'Discover session',
            }),
            getTooltipForSavedObject: (_so: any) =>
              activeTab === 'starred'
                ? i18n.translate('discover.openSession.starredTooltip', {
                    defaultMessage: 'Starred Discover session',
                  })
                : '',
            showSavedObject: (so: any) => {
              if (activeTab === 'all') return true;
              if (favorites.error) return false;
              return effectiveFavoriteIds.includes(so.id);
            },
          },
        ]}
        showFilter={true}
      />
    </div>
  );
};

export function OpenSearchPanel(props: OpenSearchPanelProps) {
  const { onClose } = props;
  const { savedObjectsTagging, http, addBasePath, contentClient, uiSettings, capabilities, core } =
    useDiscoverServices();
  const userProfileService = core.userProfile; // stable reference for profile lookups
  const hasSavedObjectPermission = Boolean(capabilities?.savedObjectsManagement?.read);
  const modalTitleId = useGeneratedHtmlId({ prefix: 'discoverSearchCreationModalTitle' });

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [selectedMeta, setSelectedMeta] = useState<any | undefined>();
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');

  const favoritesQueryClient = useMemo(() => new FavoritesQueryClient(), []);
  const favoritesClient = useMemo(
    () =>
      new FavoritesClient('discover', SavedSearchType, {
        http: core.http,
        userProfile: core.userProfile,
      }),
    [core.http, core.userProfile]
  );

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
      isLevelEnabled: () => false,
    } as unknown as Logger;
    return new ContentInsightsClient({ http, logger: loggerAdapter }, { domainId: 'discover' });
  }, [http]);

  const queryClient = useMemo(() => new QueryClient(), []);

  const loadMeta = useCallback(
    async (id: string) => {
      setLoadingMeta(true);
      try {
        const res: any = await contentClient.get({ contentTypeId: SavedSearchType, id });
        const so = res.result?.item ?? res.item ?? res; // defensive
        let esqlQuery: string | undefined;
        let rawSearchSource: string | undefined;
        try {
          const searchSourceJSON = so.attributes?.kibanaSavedObjectMeta?.searchSourceJSON;
          if (searchSourceJSON) {
            rawSearchSource = searchSourceJSON;
            const parsed = JSON.parse(searchSourceJSON);
            const q = parsed?.query;
            if (q) {
              if (q.language === 'esql' && typeof q.query === 'string') {
                esqlQuery = q.query;
              } else if (q.esql && typeof q.esql.query === 'string') {
                esqlQuery = q.esql.query;
              } else if (typeof q.esql === 'string') {
                esqlQuery = q.esql;
              }
            }
            if (!esqlQuery && typeof (parsed as any)?.esql === 'string') {
              esqlQuery = (parsed as any).esql;
            }
          }
        } catch (_e) {
          // ignore parse errors
        }
        setSelectedMeta({
          id,
          title: so.attributes?.title,
          createdAt: so.createdAt,
          createdBy: so.createdBy,
            updatedAt: so.updatedAt,
          updatedBy: so.updatedBy,
          managed: so.managed,
          isTextBasedQuery: so.attributes?.isTextBasedQuery,
          esqlQuery,
          rawSearchSource,
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
              <QueryClientProvider client={favoritesQueryClient}>
                <FavoritesContextProvider favoritesClient={favoritesClient}>
                  <FavoritesList
                    savedObjectsTagging={savedObjectsTagging}
                    contentClient={contentClient}
                    uiSettings={uiSettings}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onSelect={(id) => {
                      setSelectedId(id);
                      loadMeta(id);
                    }}
                    onOpen={(id) => {
                      insightsClient.track(id, 'viewed');
                      props.onOpenSavedSearch(id);
                      onClose();
                    }}
                    selectedId={selectedId}
                  />
                </FavoritesContextProvider>
              </QueryClientProvider>
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
              <QueryClientProvider client={queryClient}>
                <UserProfilesProvider
                  // use pre-fetched service (avoid calling hooks inside callbacks causing invalid hook warnings)
                  getUserProfile={async (uid: string) => {
                    const res = await userProfileService.bulkGet({
                      uids: new Set([uid]),
                      dataPath: 'avatar',
                    });
                    return res[0]!;
                  }}
                  bulkGetUserProfiles={async (uids: string[]) => {
                    if (!uids.length) return [] as any;
                    return userProfileService.bulkGet({ uids: new Set(uids), dataPath: 'avatar' });
                  }}
                >
                <ContentInsightsProvider contentInsightsClient={insightsClient}>
                {loadingMeta && <EuiSkeletonRectangle height={120} width={'100%'} />}
                {!loadingMeta && selectedMeta && (
                  <>
                    {(selectedMeta.isTextBasedQuery && (selectedMeta.esqlQuery || selectedMeta.rawSearchSource)) && (
                      <>
                        <EuiPanel hasBorder paddingSize="s">
                          {selectedMeta.esqlQuery && (
                            <>
                              <EuiText size="xs">
                                <strong>
                                  {i18n.translate('discover.openSession.esqlQueryLabel', {
                                    defaultMessage: 'ES|QL query',
                                  })}
                                </strong>
                              </EuiText>
                              <EuiSpacer size="xs" />
                              <EuiCodeBlock
                                language="esql"
                                fontSize="s"
                                paddingSize="s"
                                isCopyable
                                data-test-subj="discoverSessionEsqlQueryBlock"
                                overflowHeight={160}
                              >
                                {selectedMeta.esqlQuery}
                              </EuiCodeBlock>
                            </>
                          )}
                          {!selectedMeta.esqlQuery && selectedMeta.rawSearchSource && (
                            <>
                              <EuiText size="xs">
                                <strong>
                                  {i18n.translate('discover.openSession.esqlQueryNotFoundLabel', {
                                    defaultMessage: 'ES|QL query not extracted (showing raw search source snippet)',
                                  })}
                                </strong>
                              </EuiText>
                              <EuiSpacer size="xs" />
                              <EuiCodeBlock
                                language="json"
                                fontSize="s"
                                paddingSize="s"
                                isCopyable
                                data-test-subj="discoverSessionRawSearchSourceBlock"
                                overflowHeight={160}
                              >
                                {selectedMeta.rawSearchSource.slice(0, 2000)}
                              </EuiCodeBlock>
                            </>
                          )}
                        </EuiPanel>
                        <EuiSpacer size="s" />
                      </>
                    )}
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
                </UserProfilesProvider>
              </QueryClientProvider>
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

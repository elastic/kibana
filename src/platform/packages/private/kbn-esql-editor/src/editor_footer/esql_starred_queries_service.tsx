/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { EuiButtonIcon } from '@elastic/eui';
import { FavoritesClient, StardustWrapper } from '@kbn/content-management-favorites-public';
import { FAVORITES_LIMIT as ESQL_STARRED_QUERIES_LIMIT } from '@kbn/content-management-favorites-common';
import { type QueryHistoryItem, getTrimmedQuery } from '../history_local_storage';
import { TooltipWrapper } from './tooltip_wrapper';

const STARRED_QUERIES_DISCARD_KEY = 'esqlEditor.starredQueriesDiscard';

/**
 * EsqlStarredQueriesService is a service that manages the starred queries in the ES|QL editor.
 * It provides methods to add and remove queries from the starred list.
 * It also provides a method to render the starred button in the editor list table.
 *
 * @param client - The FavoritesClient instance.
 * @param starredQueries - The list of starred queries.
 * @param queries$ - The BehaviorSubject that emits the starred queries list.
 * @method initialize - Initializes the service and retrieves the starred queries from the favoriteService.
 * @method checkIfQueryIsStarred - Checks if a query is already starred.
 * @method addStarredQuery - Adds a query to the starred list.
 * @method removeStarredQuery - Removes a query from the starred list.
 * @method renderStarredButton - Renders the starred button in the editor list table.
 * @returns EsqlStarredQueriesService instance.
 *
 */
export interface StarredQueryItem extends QueryHistoryItem {
  id: string;
}

interface EsqlStarredQueriesServices {
  http: CoreStart['http'];
  userProfile: CoreStart['userProfile'];
  storage: Storage;
  usageCollection?: UsageCollectionStart;
}

interface EsqlStarredQueriesParams {
  client: FavoritesClient<StarredQueryMetadata>;
  starredQueries: StarredQueryItem[];
  storage: Storage;
}

function generateId() {
  return uuidv4();
}

export interface StarredQueryMetadata {
  queryString: string;
  createdAt: string;
  status: 'success' | 'warning' | 'error';
}

export class EsqlStarredQueriesService {
  private client: FavoritesClient<StarredQueryMetadata>;
  private starredQueries: StarredQueryItem[] = [];
  private queryToEdit: string = '';
  private queryToAdd: string = '';
  private storage: Storage;
  queries$: BehaviorSubject<StarredQueryItem[]>;
  discardModalVisibility$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor({ client, starredQueries, storage }: EsqlStarredQueriesParams) {
    this.client = client;
    this.starredQueries = starredQueries;
    this.queries$ = new BehaviorSubject(starredQueries);
    this.storage = storage;
  }

  static async initialize(services: EsqlStarredQueriesServices) {
    const client = new FavoritesClient<StarredQueryMetadata>('esql_editor', 'esql_query', {
      http: services.http,
      userProfile: services.userProfile,
      usageCollection: services.usageCollection,
    });

    const isAvailable = await client.isAvailable();
    if (!isAvailable) return null;

    const { favoriteMetadata } = (await client?.getFavorites()) || {};
    const retrievedQueries: StarredQueryItem[] = [];

    if (!favoriteMetadata) {
      return new EsqlStarredQueriesService({
        client,
        starredQueries: [],
        storage: services.storage,
      });
    }
    Object.keys(favoriteMetadata).forEach((id) => {
      const item = favoriteMetadata[id];
      const { queryString, createdAt, status } = item;
      retrievedQueries.push({ id, queryString, timeRan: createdAt, status });
    });

    return new EsqlStarredQueriesService({
      client,
      starredQueries: retrievedQueries,
      storage: services.storage,
    });
  }

  checkIfQueryIsStarred(queryString: string) {
    return this.starredQueries.some((item) => item.queryString === queryString);
  }

  private checkIfStarredQueriesLimitReached() {
    return this.starredQueries.length >= ESQL_STARRED_QUERIES_LIMIT;
  }

  async addStarredQuery(item: Pick<QueryHistoryItem, 'queryString' | 'status'>) {
    const favoriteItem: { id: string; metadata: StarredQueryMetadata } = {
      id: generateId(),
      metadata: {
        queryString: getTrimmedQuery(item.queryString),
        createdAt: new Date().toISOString(),
        status: item.status ?? 'success',
      },
    };

    // do not add the query if it's already starred or has reached the limit
    if (
      this.checkIfQueryIsStarred(favoriteItem.metadata.queryString) ||
      this.checkIfStarredQueriesLimitReached()
    ) {
      return;
    }

    const starredQueries = [...this.starredQueries];

    starredQueries.push({
      queryString: favoriteItem.metadata.queryString,
      timeRan: favoriteItem.metadata.createdAt,
      status: favoriteItem.metadata.status,
      id: favoriteItem.id,
    });
    this.starredQueries = starredQueries;
    this.queries$.next(starredQueries);
    await this.client.addFavorite(favoriteItem);

    // telemetry, add favorite click event
    this.client.reportAddFavoriteClick();
  }

  async removeStarredQuery(queryString: string) {
    const trimmedQueryString = getTrimmedQuery(queryString);
    const favoriteItem = this.starredQueries.find(
      (item) => item.queryString === trimmedQueryString
    );

    if (!favoriteItem) {
      return;
    }

    this.starredQueries = this.starredQueries.filter(
      (item) => item.queryString !== trimmedQueryString
    );
    this.queries$.next(this.starredQueries);

    await this.client.removeFavorite({ id: favoriteItem.id });

    // telemetry, remove favorite click event
    this.client.reportRemoveFavoriteClick();
  }

  async onDiscardModalClose(shouldDismissModal?: boolean, removeQuery?: boolean) {
    if (shouldDismissModal) {
      // set the local storage flag to not show the modal again
      this.storage.set(STARRED_QUERIES_DISCARD_KEY, true);
    }
    this.discardModalVisibility$.next(false);

    if (removeQuery) {
      // remove the query
      await this.removeStarredQuery(this.queryToEdit);
    }
  }

  renderStarredButton(item: QueryHistoryItem) {
    const trimmedQueryString = getTrimmedQuery(item.queryString);
    const isStarred = this.checkIfQueryIsStarred(trimmedQueryString);
    return (
      <TooltipWrapper
        tooltipContent={i18n.translate(
          'esqlEditor.query.querieshistory.starredQueriesReachedLimitTooltip',
          {
            defaultMessage:
              'Limit reached: This list can contain a maximum of {limit} items. Please remove an item before adding a new one.',
            values: { limit: ESQL_STARRED_QUERIES_LIMIT },
          }
        )}
        condition={!isStarred && this.checkIfStarredQueriesLimitReached()}
      >
        {/* show startdust effect only after starring the query and not on the initial load */}
        <StardustWrapper active={isStarred && trimmedQueryString === this.queryToAdd}>
          <EuiButtonIcon
            title={
              isStarred
                ? i18n.translate('esqlEditor.query.querieshistory.removeFavoriteTitle', {
                    defaultMessage: 'Remove ES|QL query from Starred',
                  })
                : i18n.translate('esqlEditor.query.querieshistory.addFavoriteTitle', {
                    defaultMessage: 'Add ES|QL query to Starred',
                  })
            }
            className={!isStarred ? 'cm-favorite-button--empty' : ''}
            aria-label={
              isStarred
                ? i18n.translate('esqlEditor.query.querieshistory.removeFavoriteTitle', {
                    defaultMessage: 'Remove ES|QL query from Starred',
                  })
                : i18n.translate('esqlEditor.query.querieshistory.addFavoriteTitle', {
                    defaultMessage: 'Add ES|QL query to Starred',
                  })
            }
            iconType={isStarred ? 'starFilled' : 'starEmpty'}
            disabled={!isStarred && this.checkIfStarredQueriesLimitReached()}
            onClick={async () => {
              this.queryToEdit = trimmedQueryString;
              if (isStarred) {
                // show the discard modal only if the user has not dismissed it
                if (!this.storage.get(STARRED_QUERIES_DISCARD_KEY)) {
                  this.discardModalVisibility$.next(true);
                } else {
                  await this.removeStarredQuery(item.queryString);
                }
              } else {
                this.queryToAdd = trimmedQueryString;
                await this.addStarredQuery(item);
                this.queryToAdd = '';
              }
            }}
            data-test-subj="ESQLFavoriteButton"
          />
        </StardustWrapper>
      </TooltipWrapper>
    );
  }
}

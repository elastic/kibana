/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import moment from 'moment';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { EuiButtonIcon } from '@elastic/eui';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import {
  type QueryHistoryItem,
  dateFormat,
  getMomentTimeZone,
  getTrimmedQuery,
} from '../history_local_storage';

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
  storage: Storage;
  usageCollection?: UsageCollectionStart;
}

interface EsqlStarredQueriesParams {
  client: FavoritesClient<QueryHistoryItem>;
  starredQueries: StarredQueryItem[];
  storage: Storage;
}

function generateId() {
  return uuidv4();
}

export class EsqlStarredQueriesService {
  private client: FavoritesClient<QueryHistoryItem>;
  private starredQueries: StarredQueryItem[] = [];
  private queryToEdit: string = '';
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
    const client = new FavoritesClient<QueryHistoryItem>('esql_editor', 'esql_query', {
      http: services.http,
      usageCollection: services.usageCollection,
    });

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
      const { queryString, timeRan, status } = item;
      retrievedQueries.push({ id, queryString, timeRan, status });
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

  async addStarredQuery(item: QueryHistoryItem) {
    const tz = getMomentTimeZone();
    const favoriteItem = {
      id: generateId(),
      metadata: {
        queryString: getTrimmedQuery(item.queryString),
        timeRan: moment().tz(tz).format(dateFormat),
        status: item.status,
      },
    };

    // do not add the query if it's already starred
    if (this.checkIfQueryIsStarred(favoriteItem.metadata.queryString)) {
      return;
    }

    const starredQueries = [...this.starredQueries];

    starredQueries.push({
      queryString: favoriteItem.metadata.queryString,
      timeRan: favoriteItem.metadata.timeRan,
      status: favoriteItem.metadata.status,
      id: favoriteItem.id,
    });
    this.queries$.next(starredQueries);
    this.starredQueries = starredQueries;
    await this.client.addFavorite(favoriteItem);

    // telemetry, add favorite click event
    this.client.reportAddFavoriteClick();
  }

  async removeStarredQuery(queryString: string) {
    const favoriteItem = this.starredQueries.find((item) => item.queryString === queryString);

    if (!favoriteItem) {
      return;
    }

    this.starredQueries = this.starredQueries.filter((item) => item.queryString !== queryString);
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
    this.queryToEdit = trimmedQueryString;
    const isStarred = this.checkIfQueryIsStarred(trimmedQueryString);
    return (
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
        onClick={async () => {
          if (isStarred) {
            // show the discard modal only if the user has not dismissed it
            if (!this.storage.get(STARRED_QUERIES_DISCARD_KEY)) {
              this.discardModalVisibility$.next(true);
            } else {
              await this.removeStarredQuery(item.queryString);
            }
          } else {
            await this.addStarredQuery(item);
          }
        }}
        data-test-subj="ESQLFavoriteButton"
      />
    );
  }
}

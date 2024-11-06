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
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { EuiButtonIcon } from '@elastic/eui';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import {
  type QueryHistoryItem,
  dateFormat,
  getMomentTimeZone,
  getTrimmedQuery,
} from '../history_local_storage';

export interface StarredQueryItem extends QueryHistoryItem {
  id: string;
}

interface EsqlStarredQueriesServices {
  http: CoreStart['http'];
  usageCollection?: UsageCollectionStart;
}

interface EsqlStarredQueriesParams {
  client: FavoritesClient<QueryHistoryItem>;
  starredQueries: StarredQueryItem[];
}

function generateId() {
  return uuidv4();
}

export class EsqlStarredQueriesService {
  private client: FavoritesClient<QueryHistoryItem>;
  private starredQueries: StarredQueryItem[] = [];
  queries$: BehaviorSubject<StarredQueryItem[]>;

  constructor({ client, starredQueries }: EsqlStarredQueriesParams) {
    this.client = client;
    this.starredQueries = starredQueries;
    this.queries$ = new BehaviorSubject(starredQueries);
  }

  static async initialize(services: EsqlStarredQueriesServices) {
    const client = new FavoritesClient<QueryHistoryItem>('esql_editor', 'esql_query', {
      http: services.http,
      usageCollection: services.usageCollection,
    });

    const { favoriteMetadata } = (await client?.getFavorites()) || {};
    const retrievedQueries: StarredQueryItem[] = [];

    if (!favoriteMetadata) {
      return new EsqlStarredQueriesService({ client, starredQueries: [] });
    }
    Object.keys(favoriteMetadata).forEach((id) => {
      const item = favoriteMetadata[id];
      const { queryString, timeRan, status } = item;
      retrievedQueries.push({ id, queryString, timeRan, status });
    });

    return new EsqlStarredQueriesService({
      client,
      starredQueries: retrievedQueries,
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

  renderStarredButton(item: QueryHistoryItem) {
    const trimmedQueryString = getTrimmedQuery(item.queryString);
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
        className="esqlStarredButton"
        aria-label={
          isStarred
            ? i18n.translate('esqlEditor.query.querieshistory.removeFavoriteTitle', {
                defaultMessage: 'Remove ES|QL query from Starred',
              })
            : i18n.translate('esqlEditor.query.querieshistory.addFavoriteTitle', {
                defaultMessage: 'Add ES|QL query to Starred',
              })
        }
        iconType={isStarred ? 'starMinusFilled' : 'starPlusFilled'}
        onClick={async () => {
          if (isStarred) {
            await this.removeStarredQuery(trimmedQueryString);
          } else {
            await this.addStarredQuery(item);
          }
        }}
        data-test-subj="ESQLFavoriteButton"
        css={css`
          opacity: 0.3;

          &:hover {
            visibility: visible;
            opacity: 1;
          }
        `}
      />
    );
  }
}

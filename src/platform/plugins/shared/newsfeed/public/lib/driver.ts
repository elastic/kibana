/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import * as Rx from 'rxjs';
import { NEWSFEED_DEFAULT_SERVICE_BASE_URL } from '../../common/constants';
import { ApiItem, FetchResult, NewsfeedPluginBrowserConfig } from '../types';
import { INewsfeedApiDriver } from './types';
import { convertItems } from './convert_items';
import type { NewsfeedStorage } from './storage';

type ApiConfig = NewsfeedPluginBrowserConfig['service'];

interface NewsfeedResponse {
  items: ApiItem[];
}

export class NewsfeedApiDriver implements INewsfeedApiDriver {
  private readonly kibanaVersion: string;
  private readonly loadedTime = moment().utc(); // the date is compared to time in UTC format coming from the service

  constructor(
    kibanaVersion: string,
    private readonly userLanguage: string,
    private readonly fetchInterval: number,
    private readonly storage: NewsfeedStorage
  ) {
    // The API only accepts versions in the format `X.Y.Z`, so we need to drop the `-SNAPSHOT` or any other label after it
    this.kibanaVersion = kibanaVersion.replace(/^(\d+\.\d+\.\d+).*/, '$1');
  }

  shouldFetch(): boolean {
    const lastFetchUtc = this.storage.getLastFetchTime();
    if (!lastFetchUtc) {
      return true;
    }
    const last = moment(lastFetchUtc);

    // does the last fetch time precede the time that the page was loaded?
    if (this.loadedTime.diff(last) > 0) {
      return true;
    }

    const now = moment.utc(); // always use UTC to compare timestamps that came from the service
    const duration = moment.duration(now.diff(last));
    return duration.asMilliseconds() > this.fetchInterval;
  }

  fetchNewsfeedItems(config: ApiConfig): Rx.Observable<FetchResult> {
    const urlPath = config.pathTemplate.replace('{VERSION}', this.kibanaVersion);
    const fullUrl = (config.urlRoot || NEWSFEED_DEFAULT_SERVICE_BASE_URL) + urlPath;
    const request = new Request(fullUrl, {
      method: 'GET',
    });

    return Rx.from(
      window.fetch(request).then(async (response) => {
        const { items } = (await response.json()) as NewsfeedResponse;
        return this.convertResponse(items);
      })
    );
  }

  private convertResponse(items: ApiItem[]): FetchResult {
    const feedItems = convertItems(items, this.userLanguage);
    const hasNew = this.storage.setFetchedItems(feedItems.map((item) => item.hash));

    return {
      error: null,
      kibanaVersion: this.kibanaVersion,
      hasNew,
      feedItems,
    };
  }
}

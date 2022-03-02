/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import React from 'react';
import { NewsFeed } from './news_feed';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

const mockNewsFetchResult = {
  error: null,
  feedItems: [
    {
      badge: null,
      description: 'Content of blog post 1',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: 'hash1',
      linkText: 'Read more on the blog',
      linkUrl: 'link-blog-post-1',
      publishOn: moment('2020-08-31T11:23:47Z'),
      title: 'Blog Post 1',
    },
    {
      badge: null,
      description: 'Content of blog post 2',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: 'hash2',
      linkText: 'Read more on the blog',
      linkUrl: 'link-blog-post-2',
      publishOn: moment('2020-08-14T11:23:47Z'),
      title: 'Alerting and anomaly detection for uptime and reliability',
    },
    {
      badge: null,
      description: 'Content of blog post 1',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: 'hash3',
      linkText: 'Learn more on the blog',
      linkUrl: 'link-blog-post-3',
      publishOn: moment('2020-08-01T11:23:47Z'),
      title: 'Optimizing costs in Elastic Cloud: Hot-warm + index lifecycle management',
    },
  ],
  hasNew: true,
  kibanaVersion: '8.0.0',
};

describe('FeedItem', () => {
  test('render', () => {
    const component = shallowWithIntl(<NewsFeed newsFetchResult={mockNewsFetchResult} />);
    expect(component).toMatchSnapshot();
  });
});

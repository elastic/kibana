/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment';
import React from 'react';
import { NewsFeed } from './news_feed';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

const mockNewsFetchResult = {
  error: null,
  feedItems: [
    {
      badge: null,
      description:
        'The official Go client now includes features like request retries and node discovery. Learn more about its architecture and package and repository layout.',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: '8e18fcedbc',
      linkText: 'Read more on the blog',
      linkUrl:
        'https://www.elastic.co/blog/the-go-client-for-elasticsearch-introduction?blade=kibanafeed',
      publishOn: moment('2020-08-31T04:23:47Z'),
      title: 'The Go client for Elasticsearch: Introduction',
    },
    {
      badge: null,
      description:
        'Learn how to use Elastic Uptime to configure alerting and anomaly detection for sites, services, and APIs.',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: 'fb3e3d42ef',
      linkText: 'Read more on the blog',
      linkUrl:
        'https://www.elastic.co/blog/alerting-and-anomaly-detection-for-uptime-and-reliability?blade=kibanafeed',
      publishOn: moment('2020-08-14T04:23:47Z'),
      title: 'Alerting and anomaly detection for uptime and reliability',
    },
    {
      badge: null,
      description:
        'Managing data using hot-warm architecture and ILM is a cost-effective way of retaining data — and a great way to easily keep your cloud costs down.',
      expireOn: moment('2050-12-31T11:59:59Z'),
      hash: 'b2fc7d47d5',
      linkText: 'Learn more on the blog',
      linkUrl:
        'https://www.elastic.co/blog/optimizing-costs-elastic-cloud-hot-warm-index-lifecycle-management?blade=kibanafeed',
      publishOn: moment('2020-08-01T04:23:47Z'),
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

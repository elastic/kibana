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

import React, { FC } from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FetchResult } from 'src/plugins/newsfeed/public';

interface Props {
  newsFetchResult: FetchResult;
}

export const NewsFeed: FC<Props> = ({ newsFetchResult }) => (
  <section aria-labelledby="kbnOverviewNews__title" className="kbnOverviewNews">
    <EuiTitle size="s">
      <h2 id="kbnOverviewNews__title">
        <FormattedMessage id="kibanaOverview.news.title" defaultMessage="What's new" />
      </h2>
    </EuiTitle>

    <EuiSpacer size="m" />

    <div className="kbnOverviewNews__content">
      {newsFetchResult.feedItems
        .slice(0, 3)
        .map(({ title, description, linkUrl, publishOn }, index) => (
          <article key={title} aria-labelledby={`kbnOverviewNews__title${index}`}>
            <header>
              <EuiTitle size="xxs">
                <h3 id={`kbnOverviewNews__title${index}`}>
                  <EuiLink href={linkUrl} target="_blank">
                    {title}
                  </EuiLink>
                </h3>
              </EuiTitle>

              <EuiText size="xs" color="subdued">
                <p>
                  <time dateTime={publishOn.format('YYYY-MM-DD')}>
                    {publishOn.format('DD MMMM YYYY')}
                  </time>
                </p>
              </EuiText>
            </header>

            <EuiText size="xs">
              <p>{description}</p>
            </EuiText>
          </article>
        ))}
    </div>
  </section>
);

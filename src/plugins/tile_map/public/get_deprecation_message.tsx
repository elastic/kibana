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

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getCoreService, getQueryService, getShareService } from './services';

export async function getDeprecationMessage(vis: Vis) {
  const mapsUrlGenerator = getShareService().urlGenerators.getUrlGenerator(
    'MAPS_APP_URL_GENERATOR'
  );

  let action;
  if (!mapsUrlGenerator) {
    action = (
      <FormattedMessage
        id="tileMap.vis.defaultDistributionMessage"
        defaultMessage="To get Maps, upgrade to the {defaultDistribution} of Elasticsearch and Kibana."
        values={{
          defaultDistribution: (
            <EuiLink
              color="accent"
              external
              href="https://www.elastic.co/downloads/kibana"
              target="_blank"
            >
              default distribution
            </EuiLink>
          ),
        }}
      />
    );
  } else {
    const query = getQueryService();
    const url = await mapsUrlGenerator.createUrl({
      filters: query.filterManager.getFilters(),
      query: query.queryString.getQuery(),
      timeRange: query.timefilter.timefilter.getTime(),
    });
    action = (
      <div>
        <EuiButton
          onClick={(e) => {
            e.preventDefault();
            getCoreService().application.navigateToUrl(url);
          }}
          size="s"
        >
          <FormattedMessage id="tileMap.vis.viewInMaps" defaultMessage="View in Maps" />
        </EuiButton>
      </div>
    );
  }

  return (
    <FormattedMessage
      id="tileMap.vis.deprecationMessage"
      defaultMessage="Coordinate map will migrate to Maps in 8.0. With Maps, you can add multiple layers and indices, plot individual documents, symbolize features from data values, and more. {action}"
      values={{ action }}
    />
  );
}

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
import { EuiButton, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getCoreService, getQueryService, getShareService } from './services';
import { indexPatterns } from '../../data/public';
import { Vis } from '../../visualizations/public';

export function getDeprecationMessage(vis: Vis) {
  const mapsTileMapUrlGenerator = getShareService().urlGenerators.getUrlGenerator(
    'MAPS_APP_TILE_MAP_URL_GENERATOR'
  );

  let action;
  if (!mapsTileMapUrlGenerator) {
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
    action = (
      <div>
        <EuiButton
          onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();

            const query = getQueryService();
            const createUrlParams: { [key: string]: any } = {
              title: vis.title,
              mapType: vis.params.mapType,
              colorSchema: vis.params.colorSchema,
              indexPatternId: vis.data.indexPattern?.id,
              metricAgg: 'count',
              filters: query.filterManager.getFilters(),
              query: query.queryString.getQuery(),
              timeRange: query.timefilter.timefilter.getTime(),
            };

            const bucketAggs = vis.data?.aggs?.byType('buckets');
            if (bucketAggs?.length && bucketAggs[0].type.dslName === 'geohash_grid') {
              createUrlParams.geoFieldName = bucketAggs[0].getField()?.name;
            } else if (vis.data.indexPattern) {
              // attempt to default to first geo point field when geohash is not configured yet
              const geoField = vis.data.indexPattern.fields.find((field) => {
                return (
                  !indexPatterns.isNestedField(field) &&
                  field.aggregatable &&
                  field.type === 'geo_point'
                );
              });
              if (geoField) {
                createUrlParams.geoFieldName = geoField.name;
              }
            }

            const metricAggs = vis.data?.aggs?.byType('metrics');
            if (metricAggs?.length) {
              createUrlParams.metricAgg = metricAggs[0].type.dslName;
              createUrlParams.metricFieldName = metricAggs[0].getField()?.name;
            }

            const url = await mapsTileMapUrlGenerator.createUrl(createUrlParams);
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

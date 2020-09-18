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
import { getCoreService, getQueryService, getShareService } from './kibana_services';
import { Vis } from '../../visualizations/public';

export function getDeprecationMessage(vis: Vis) {
  const mapsRegionMapUrlGenerator = getShareService().urlGenerators.getUrlGenerator(
    'MAPS_APP_REGION_MAP_URL_GENERATOR'
  );

  let action;
  if (!mapsRegionMapUrlGenerator) {
    action = (
      <FormattedMessage
        id="regionMap.vis.defaultDistributionMessage"
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
              emsLayerId: vis.params.selectedLayer.isEMS ? vis.params.selectedLayer.id : undefined,
              leftFieldName: vis.params.selectedLayer.isEMS
                ? vis.params.selectedJoinField.name
                : undefined,
              colorSchema: vis.params.colorSchema,
              indexPatternId: vis.data.indexPattern?.id,
              indexPatternTitle: vis.data.indexPattern?.title,
              metricAgg: 'count',
              filters: query.filterManager.getFilters(),
              query: query.queryString.getQuery(),
              timeRange: query.timefilter.timefilter.getTime(),
            };

            const bucketAggs = vis.data?.aggs?.byType('buckets');
            if (bucketAggs?.length && bucketAggs[0].type.dslName === 'terms') {
              createUrlParams.termsFieldName = bucketAggs[0].getField()?.name;
            }

            const metricAggs = vis.data?.aggs?.byType('metrics');
            if (metricAggs?.length) {
              createUrlParams.metricAgg = metricAggs[0].type.dslName;
              createUrlParams.metricFieldName = metricAggs[0].getField()?.name;
            }

            const url = await mapsRegionMapUrlGenerator.createUrl(createUrlParams);
            getCoreService().application.navigateToUrl(url);
          }}
          size="s"
        >
          <FormattedMessage id="regionMap.vis.viewInMaps" defaultMessage="View in Maps" />
        </EuiButton>
      </div>
    );
  }

  return (
    <FormattedMessage
      id="regionMap.vis.deprecationMessage"
      defaultMessage="Region map will migrate to Maps in 8.0. With Maps, you can add multiple layers and indices, plot individual documents, symbolize features from data values, and more. {action}"
      values={{ action }}
    />
  );
}

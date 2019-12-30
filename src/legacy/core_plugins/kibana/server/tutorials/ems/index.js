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

import { i18n } from '@kbn/i18n';
import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';

export function emsBoundariesSpecProvider(server) {
  function addBasePath(url) {
    const basePath = server.config().get('server.basePath');
    return `${basePath.length > 0 ? `${basePath}` : ''}${url}`;
  }

  return {
    id: 'emsBoundaries',
    name: i18n.translate('kbn.server.tutorials.ems.nameTitle', {
      defaultMessage: 'EMS Boundaries',
    }),
    category: TUTORIAL_CATEGORY.OTHER,
    shortDescription: i18n.translate('kbn.server.tutorials.ems.shortDescription', {
      defaultMessage: 'Administrative boundaries from Elastic Maps Service.',
    }),
    longDescription: i18n.translate('kbn.server.tutorials.ems.longDescription', {
      defaultMessage:
        '[Elastic Maps Service (EMS)](https://www.elastic.co/elastic-maps-service) \
hosts tile layers and vector shapes of administrative boundaries. \
Indexing EMS administrative boundaries in Elasticsearch allows for search on boundary property fields.',
    }),
    euiIconType: 'emsApp',
    completionTimeMinutes: 1,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/ems/boundaries_screenshot.png',
    onPrem: {
      instructionSets: [
        {
          instructionVariants: [
            {
              id: 'EMS',
              instructions: [
                {
                  title: i18n.translate('kbn.server.tutorials.ems.downloadStepTitle', {
                    defaultMessage: 'Download Elastic Maps Service boundaries',
                  }),
                  textPre: i18n.translate('kbn.server.tutorials.ems.downloadStepText', {
                    defaultMessage:
                      '1. Navigate to Elastic Maps Service [landing page]({emsLandingPageUrl}).\n\
2. In the left sidebar, select an administrative boundary.\n\
3. Click `Download GeoJSON` button.',
                    values: {
                      emsLandingPageUrl: server.config().get('map.emsLandingPageUrl'),
                    },
                  }),
                },
                {
                  title: i18n.translate('kbn.server.tutorials.ems.uploadStepTitle', {
                    defaultMessage: 'Index Elastic Maps Service boundaries',
                  }),
                  textPre: i18n.translate('kbn.server.tutorials.ems.uploadStepText', {
                    defaultMessage:
                      '1. Open [Elastic Maps]({newMapUrl}).\n\
2. Click `Add layer`, then select `Upload GeoJSON`.\n\
3. Upload the GeoJSON file and click `Import file`.',
                    values: {
                      newMapUrl: addBasePath('/app/maps#/map'),
                    },
                  }),
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

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
import {
  createAction,
  ACTION_VISUALIZE_FIELD,
  VisualizeFieldContext,
} from '../../../ui_actions/public';
import {
  getApplication,
  getUISettings,
  getIndexPatterns,
  getQueryService,
  getShareService,
} from '../services';
import { VISUALIZE_APP_URL_GENERATOR, VisualizeUrlGeneratorState } from '../url_generator';
import { AGGS_TERMS_SIZE_SETTING } from '../../common/constants';

export const visualizeFieldAction = createAction<typeof ACTION_VISUALIZE_FIELD>({
  type: ACTION_VISUALIZE_FIELD,
  getDisplayName: () =>
    i18n.translate('visualize.discover.visualizeFieldLabel', {
      defaultMessage: 'Visualize field',
    }),
  isCompatible: async () => !!getApplication().capabilities.visualize.show,
  getHref: async (context) => {
    const url = await getVisualizeUrl(context);
    return url;
  },
  execute: async (context) => {
    const url = await getVisualizeUrl(context);
    const hash = url.split('#')[1];

    getApplication().navigateToApp('visualize', {
      path: `/#${hash}`,
    });
  },
});

const getVisualizeUrl = async (context: VisualizeFieldContext) => {
  const indexPattern = await getIndexPatterns().get(context.indexPatternId);
  const field = indexPattern.fields.find((fld) => fld.name === context.fieldName);
  const aggsTermSize = getUISettings().get(AGGS_TERMS_SIZE_SETTING);
  let agg;

  // If we're visualizing a date field, and our index is time based (and thus has a time filter),
  // then run a date histogram
  if (field?.type === 'date' && indexPattern.timeFieldName === context.fieldName) {
    agg = {
      type: 'date_histogram',
      schema: 'segment',
      params: {
        field: context.fieldName,
        interval: 'auto',
      },
    };
  } else {
    agg = {
      type: 'terms',
      schema: 'segment',
      params: {
        field: context.fieldName,
        size: parseInt(aggsTermSize, 10),
        orderBy: '1',
      },
    };
  }
  const generator = getShareService().urlGenerators.getUrlGenerator(VISUALIZE_APP_URL_GENERATOR);
  const urlState: VisualizeUrlGeneratorState = {
    filters: getQueryService().filterManager.getFilters(),
    query: getQueryService().queryString.getQuery(),
    timeRange: getQueryService().timefilter.timefilter.getTime(),
    indexPatternId: context.indexPatternId,
    type: 'histogram',
    vis: {
      type: 'histogram',
      aggs: [{ schema: 'metric', type: 'count', id: '1' }, agg],
    },
  };
  return generator.createUrl(urlState);
};

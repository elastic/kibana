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

import chrome from 'ui/chrome';
import { noop } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SearchSource, getRequestInspectorStats, getResponseInspectorStats } from '../../courier';
import { BucketAggType } from './_bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { IBucketAggConfig } from './_bucket_agg_type';
import { createFilterTerms } from './create_filter/terms';
import { wrapWithInlineComp } from './inline_comp_wrapper';
import { isStringType, migrateIncludeExcludeFormat } from './migrate_include_exclude_format';
import { OrderAggParamEditor } from '../../vis/editors/default/controls/order_agg';
import { OrderParamEditor } from '../../vis/editors/default/controls/order';
import { OrderByParamEditor, aggFilter } from '../../vis/editors/default/controls/order_by';
import { SizeParamEditor } from '../../vis/editors/default/controls/size';
import { MissingBucketParamEditor } from '../../vis/editors/default/controls/missing_bucket';
import { OtherBucketParamEditor } from '../../vis/editors/default/controls/other_bucket';
import { AggConfigs } from '../agg_configs';

import { Adapters } from '../../../../../plugins/inspector/public';
import { ContentType, FieldFormat, KBN_FIELD_TYPES } from '../../../../../plugins/data/public';

// @ts-ignore
import { Schemas } from '../../vis/editors/default/schemas';

import {
  buildOtherBucketAgg,
  mergeOtherBucketAggResponse,
  updateMissingBucket,
  // @ts-ignore
} from './_terms_other_bucket_helper';

const [orderAggSchema] = new Schemas([
  {
    group: 'none',
    name: 'orderAgg',
    // This string is never visible to the user so it doesn't need to be translated
    title: 'Order Agg',
    hideCustomLabel: true,
    aggFilter,
  },
]).all;

const termsTitle = i18n.translate('common.ui.aggTypes.buckets.termsTitle', {
  defaultMessage: 'Terms',
});

export const termsBucketAgg = new BucketAggType({
  name: BUCKET_TYPES.TERMS,
  title: termsTitle,
  makeLabel(agg) {
    const params = agg.params;
    return agg.getFieldDisplayName() + ': ' + params.order.text;
  },
  getFormat(bucket): FieldFormat {
    return {
      getConverterFor: (type: ContentType) => {
        return (val: any) => {
          if (val === '__other__') {
            return bucket.params.otherBucketLabel;
          }
          if (val === '__missing__') {
            return bucket.params.missingBucketLabel;
          }
          const parsedUrl = {
            origin: window.location.origin,
            pathname: window.location.pathname,
            basePath: chrome.getBasePath(),
          };
          const converter = bucket.params.field.format.getConverterFor(type);

          return converter(val, undefined, undefined, parsedUrl);
        };
      },
    } as FieldFormat;
  },
  createFilter: createFilterTerms,
  postFlightRequest: async (
    resp: any,
    aggConfigs: AggConfigs,
    aggConfig: IBucketAggConfig,
    searchSource: SearchSource,
    inspectorAdapters: Adapters,
    abortSignal?: AbortSignal
  ) => {
    if (!resp.aggregations) return resp;
    const nestedSearchSource = searchSource.createChild();
    if (aggConfig.params.otherBucket) {
      const filterAgg = buildOtherBucketAgg(aggConfigs, aggConfig, resp);
      if (!filterAgg) return resp;

      nestedSearchSource.setField('aggs', filterAgg);

      const request = inspectorAdapters.requests.start(
        i18n.translate('common.ui.aggTypes.buckets.terms.otherBucketTitle', {
          defaultMessage: 'Other bucket',
        }),
        {
          description: i18n.translate('common.ui.aggTypes.buckets.terms.otherBucketDescription', {
            defaultMessage:
              'This request counts the number of documents that fall ' +
              'outside the criterion of the data buckets.',
          }),
        }
      );
      nestedSearchSource.getSearchRequestBody().then((body: string) => {
        request.json(body);
      });
      request.stats(getRequestInspectorStats(nestedSearchSource));

      const response = await nestedSearchSource.fetch({ abortSignal });
      request.stats(getResponseInspectorStats(nestedSearchSource, response)).ok({ json: response });
      resp = mergeOtherBucketAggResponse(aggConfigs, resp, response, aggConfig, filterAgg());
    }
    if (aggConfig.params.missingBucket) {
      resp = updateMissingBucket(resp, aggConfigs, aggConfig);
    }
    return resp;
  },
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: [
        KBN_FIELD_TYPES.NUMBER,
        KBN_FIELD_TYPES.BOOLEAN,
        KBN_FIELD_TYPES.DATE,
        KBN_FIELD_TYPES.IP,
        KBN_FIELD_TYPES.STRING,
      ],
    },
    {
      name: 'orderBy',
      editorComponent: OrderByParamEditor,
      write: noop, // prevent default write, it's handled by orderAgg
    },
    {
      name: 'orderAgg',
      type: 'agg',
      default: null,
      editorComponent: OrderAggParamEditor,
      makeAgg(termsAgg, state) {
        state = state || {};
        state.schema = orderAggSchema;
        const orderAgg = termsAgg.aggConfigs.createAggConfig<IBucketAggConfig>(state, {
          addToAggConfigs: false,
        });
        orderAgg.id = termsAgg.id + '-orderAgg';

        return orderAgg;
      },
      write(agg, output, aggs) {
        const dir = agg.params.order.value;
        const order: Record<string, any> = (output.params.order = {});

        let orderAgg = agg.params.orderAgg || aggs!.getResponseAggById(agg.params.orderBy);

        // TODO: This works around an Elasticsearch bug the always casts terms agg scripts to strings
        // thus causing issues with filtering. This probably causes other issues since float might not
        // be able to contain the number on the elasticsearch side
        if (output.params.script) {
          output.params.value_type =
            agg.getField().type === 'number' ? 'float' : agg.getField().type;
        }

        if (agg.params.missingBucket && agg.params.field.type === 'string') {
          output.params.missing = '__missing__';
        }

        if (!orderAgg) {
          order[agg.params.orderBy || '_count'] = dir;
          return;
        }

        if (orderAgg.type.name === 'count') {
          order._count = dir;
          return;
        }

        const orderAggId = orderAgg.id;

        if (orderAgg.parentId && aggs) {
          orderAgg = aggs.byId(orderAgg.parentId);
        }

        output.subAggs = (output.subAggs || []).concat(orderAgg);
        order[orderAggId] = dir;
      },
    },
    {
      name: 'order',
      type: 'optioned',
      default: 'desc',
      editorComponent: wrapWithInlineComp(OrderParamEditor),
      options: [
        {
          text: i18n.translate('common.ui.aggTypes.buckets.terms.orderDescendingTitle', {
            defaultMessage: 'Descending',
          }),
          value: 'desc',
        },
        {
          text: i18n.translate('common.ui.aggTypes.buckets.terms.orderAscendingTitle', {
            defaultMessage: 'Ascending',
          }),
          value: 'asc',
        },
      ],
      write: noop, // prevent default write, it's handled by orderAgg
    },
    {
      name: 'size',
      editorComponent: wrapWithInlineComp(SizeParamEditor),
      default: 5,
    },
    {
      name: 'otherBucket',
      default: false,
      editorComponent: OtherBucketParamEditor,
      write: noop,
    },
    {
      name: 'otherBucketLabel',
      type: 'string',
      default: i18n.translate('common.ui.aggTypes.buckets.terms.otherBucketLabel', {
        defaultMessage: 'Other',
      }),
      displayName: i18n.translate('common.ui.aggTypes.otherBucket.labelForOtherBucketLabel', {
        defaultMessage: 'Label for other bucket',
      }),
      shouldShow: agg => agg.getParam('otherBucket'),
      write: noop,
    },
    {
      name: 'missingBucket',
      default: false,
      editorComponent: MissingBucketParamEditor,
      write: noop,
    },
    {
      name: 'missingBucketLabel',
      default: i18n.translate('common.ui.aggTypes.buckets.terms.missingBucketLabel', {
        defaultMessage: 'Missing',
        description: `Default label used in charts when documents are missing a field.
          Visible when you create a chart with a terms aggregation and enable "Show missing values"`,
      }),
      type: 'string',
      displayName: i18n.translate('common.ui.aggTypes.otherBucket.labelForMissingValuesLabel', {
        defaultMessage: 'Label for missing values',
      }),
      shouldShow: agg => agg.getParam('missingBucket'),
      write: noop,
    },
    {
      name: 'exclude',
      displayName: i18n.translate('common.ui.aggTypes.buckets.terms.excludeLabel', {
        defaultMessage: 'Exclude',
      }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat,
    },
    {
      name: 'include',
      displayName: i18n.translate('common.ui.aggTypes.buckets.terms.includeLabel', {
        defaultMessage: 'Include',
      }),
      type: 'string',
      advanced: true,
      shouldShow: isStringType,
      ...migrateIncludeExcludeFormat,
    },
  ],
});

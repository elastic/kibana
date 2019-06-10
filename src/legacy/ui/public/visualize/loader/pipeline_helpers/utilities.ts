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
import { identity } from 'lodash';
import { AggConfig, Vis } from 'ui/vis';
// @ts-ignore
import { FieldFormat } from '../../../../field_formats/field_format';
// @ts-ignore
import { tabifyGetColumns } from '../../../agg_response/tabify/_get_columns';
import chrome from '../../../chrome';
// @ts-ignore
import { fieldFormats } from '../../../registry/field_formats';

const config = chrome.getUiSettingsClient();

const getConfig = (...args: any[]): any => config.get(...args);
const getDefaultFieldFormat = () => ({ convert: identity });

const getFieldFormat = (id: string, params: object) => {
  const Format = fieldFormats.byId[id];
  if (Format) {
    return new Format(params, getConfig);
  } else {
    return getDefaultFieldFormat();
  }
};

export const getFormat = (mapping: any) => {
  if (!mapping) {
    return getDefaultFieldFormat();
  }
  const { id } = mapping;
  if (id === 'range') {
    const RangeFormat = FieldFormat.from((range: any) => {
      const format = getFieldFormat(id, mapping.params);
      return i18n.translate('common.ui.aggTypes.buckets.ranges.rangesFormatMessage', {
        defaultMessage: '{from} to {to}',
        values: {
          from: format.convert(range.gte),
          to: format.convert(range.lt),
        },
      });
    });
    return new RangeFormat();
  } else if (id === 'terms') {
    return {
      getConverterFor: (type: string) => {
        const format = getFieldFormat(mapping.params.id, mapping.params);
        return (val: string) => {
          if (val === '__other__') {
            return mapping.params.otherBucketLabel;
          }
          if (val === '__missing__') {
            return mapping.params.missingBucketLabel;
          }
          const parsedUrl = {
            origin: window.location.origin,
            pathname: window.location.pathname,
            basePath: chrome.getBasePath(),
          };
          return format.convert(val, undefined, undefined, parsedUrl);
        };
      },
      convert: (val: string, type: string) => {
        const format = getFieldFormat(mapping.params.id, mapping.params);
        if (val === '__other__') {
          return mapping.params.otherBucketLabel;
        }
        if (val === '__missing__') {
          return mapping.params.missingBucketLabel;
        }
        const parsedUrl = {
          origin: window.location.origin,
          pathname: window.location.pathname,
          basePath: chrome.getBasePath(),
        };
        return format.convert(val, type, undefined, parsedUrl);
      },
    };
  } else {
    return getFieldFormat(id, mapping.params);
  }
};

export const getTableAggs = (vis: Vis): AggConfig[] => {
  if (!vis.aggs || !vis.aggs.getResponseAggs) {
    return [];
  }
  const columns = tabifyGetColumns(vis.aggs.getResponseAggs(), !vis.isHierarchical());
  return columns.map((c: any) => c.aggConfig);
};

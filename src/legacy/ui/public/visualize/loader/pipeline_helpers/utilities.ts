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
import { IAggConfig } from 'ui/agg_types';
import { npStart } from 'ui/new_platform';
import { SerializedFieldFormat } from 'src/plugins/expressions/public';
import {
  fieldFormats,
  IFieldFormat,
  FieldFormatId,
  FieldFormatsContentType,
} from '../../../../../../plugins/data/public';
import { Vis } from '../../../../../core_plugins/visualizations/public';

import { tabifyGetColumns } from '../../../agg_response/tabify/_get_columns';
import { DateRangeKey, convertDateRangeToString } from '../../../agg_types';
import { IpRangeKey, convertIPRangeToString } from '../../../agg_types';

interface TermsFieldFormatParams {
  otherBucketLabel: string;
  missingBucketLabel: string;
  id: string;
}

function isTermsFieldFormat(
  serializedFieldFormat: SerializedFieldFormat
): serializedFieldFormat is SerializedFieldFormat<TermsFieldFormatParams> {
  return serializedFieldFormat.id === 'terms';
}

const getConfig = (key: string, defaultOverride?: any): any =>
  npStart.core.uiSettings.get(key, defaultOverride);
const DefaultFieldFormat = fieldFormats.FieldFormat.from(identity);

const getFieldFormat = (id?: FieldFormatId, params: object = {}): IFieldFormat => {
  const fieldFormatsService = npStart.plugins.data.fieldFormats;

  if (id) {
    const Format = fieldFormatsService.getType(id);

    if (Format) {
      return new Format(params, getConfig);
    }
  }

  return new DefaultFieldFormat();
};

export const createFormat = (agg: IAggConfig): SerializedFieldFormat => {
  const format: SerializedFieldFormat = agg.params.field ? agg.params.field.format.toJSON() : {};
  const formats: Record<string, () => SerializedFieldFormat> = {
    date_range: () => ({ id: 'date_range', params: format }),
    ip_range: () => ({ id: 'ip_range', params: format }),
    percentile_ranks: () => ({ id: 'percent' }),
    count: () => ({ id: 'number' }),
    cardinality: () => ({ id: 'number' }),
    date_histogram: () => ({
      id: 'date',
      params: {
        pattern: (agg as any).buckets.getScaledDateFormat(),
      },
    }),
    terms: () => ({
      id: 'terms',
      params: {
        id: format.id,
        otherBucketLabel: agg.params.otherBucketLabel,
        missingBucketLabel: agg.params.missingBucketLabel,
        ...format.params,
      },
    }),
    range: () => ({
      id: 'range',
      params: { id: format.id, ...format.params },
    }),
  };

  return formats[agg.type.name] ? formats[agg.type.name]() : format;
};

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export const getFormat: FormatFactory = mapping => {
  if (!mapping) {
    return new DefaultFieldFormat();
  }
  const { id } = mapping;
  if (id === 'range') {
    const RangeFormat = fieldFormats.FieldFormat.from((range: any) => {
      const format = getFieldFormat(id, mapping.params);
      const gte = '\u2265';
      const lt = '\u003c';
      return i18n.translate('common.ui.aggTypes.rangesFormatMessage', {
        defaultMessage: '{gte} {from} and {lt} {to}',
        values: {
          gte,
          from: format.convert(range.gte),
          lt,
          to: format.convert(range.lt),
        },
      });
    });
    return new RangeFormat();
  } else if (id === 'date_range') {
    const nestedFormatter = mapping.params as SerializedFieldFormat;
    const DateRangeFormat = fieldFormats.FieldFormat.from((range: DateRangeKey) => {
      const format = getFieldFormat(nestedFormatter.id, nestedFormatter.params);
      return convertDateRangeToString(range, format.convert.bind(format));
    });
    return new DateRangeFormat();
  } else if (id === 'ip_range') {
    const nestedFormatter = mapping.params as SerializedFieldFormat;
    const IpRangeFormat = fieldFormats.FieldFormat.from((range: IpRangeKey) => {
      const format = getFieldFormat(nestedFormatter.id, nestedFormatter.params);
      return convertIPRangeToString(range, format.convert.bind(format));
    });
    return new IpRangeFormat();
  } else if (isTermsFieldFormat(mapping) && mapping.params) {
    const { params } = mapping;
    const convert = (val: string, type: FieldFormatsContentType) => {
      const format = getFieldFormat(params.id, mapping.params);

      if (val === '__other__') {
        return params.otherBucketLabel;
      }
      if (val === '__missing__') {
        return params.missingBucketLabel;
      }

      return format.convert(val, type);
    };

    return {
      convert,
      getConverterFor: (type: FieldFormatsContentType) => (val: string) => convert(val, type),
    } as IFieldFormat;
  } else {
    return getFieldFormat(id, mapping.params);
  }
};

export const getTableAggs = (vis: Vis): IAggConfig[] => {
  if (!vis.aggs || !vis.aggs.getResponseAggs) {
    return [];
  }
  const columns = tabifyGetColumns(vis.aggs.getResponseAggs(), !vis.isHierarchical());
  return columns.map(c => c.aggConfig);
};

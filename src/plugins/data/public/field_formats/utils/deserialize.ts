/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { identity } from 'lodash';

import { SerializedFieldFormat } from '../../../../expressions/common/types';

import { FieldFormat } from '../../../common';
import { FormatFactory } from '../../../common/field_formats/utils';
import { getFormatWithAggs } from '../../../common/search/aggs';
import { DataPublicPluginStart, IFieldFormat } from '../../../public';
import { getUiSettings } from '../../../public/services';

const getConfig = (key: string, defaultOverride?: any): any =>
  getUiSettings().get(key, defaultOverride);
const DefaultFieldFormat = FieldFormat.from(identity);

export const deserializeFieldFormat: FormatFactory = function (
  this: DataPublicPluginStart['fieldFormats'],
  serializedFieldFormat?: SerializedFieldFormat
) {
  if (!serializedFieldFormat) {
    return new DefaultFieldFormat();
  }

  const getFormat = (mapping: SerializedFieldFormat): IFieldFormat => {
    const { id, params = {} } = mapping;
    if (id) {
      const Format = this.getType(id);

      if (Format) {
        return new Format(params, getConfig);
      }
    }

    return new DefaultFieldFormat();
  };

  // decorate getFormat to handle custom types created by aggs
  const getFieldFormat = getFormatWithAggs(getFormat);

  return getFieldFormat(serializedFieldFormat);
};

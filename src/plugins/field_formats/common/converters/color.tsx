/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import ReactDOM from 'react-dom/server';
import { findLast, cloneDeep, escape } from 'lodash';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { HtmlContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { asPrettyString } from '../utils';
import { DEFAULT_CONVERTER_COLOR } from '../constants/color_default';

/** @public */
export class ColorFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.COLOR;
  static title = i18n.translate('fieldFormats.color.title', {
    defaultMessage: 'Color',
  });
  static fieldType = [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING];

  getParamDefaults() {
    return {
      fieldType: null, // populated by editor, see controller below
      colors: [cloneDeep(DEFAULT_CONVERTER_COLOR)],
    };
  }

  findColorRuleForVal(val: string | number) {
    switch (this.param('fieldType')) {
      case 'string':
        return findLast(this.param('colors'), (colorParam: typeof DEFAULT_CONVERTER_COLOR) => {
          try {
            return new RegExp(colorParam.regex).test(val as string);
          } catch (e) {
            return false;
          }
        });

      case 'number':
        return findLast(this.param('colors'), ({ range }) => {
          if (!range) return;
          const [start, end] = range.split(':');
          return val >= Number(start) && val <= Number(end);
        });

      default:
        return null;
    }
  }

  htmlConvert: HtmlContextTypeConvert = (val: string | number) => {
    const color = this.findColorRuleForVal(val) as typeof DEFAULT_CONVERTER_COLOR;

    const displayVal = escape(asPrettyString(val));
    if (!color) return displayVal;

    return ReactDOM.renderToStaticMarkup(
      <span
        style={{
          color: color.text,
          backgroundColor: color.background,
        }}
        dangerouslySetInnerHTML={{ __html: displayVal }} // eslint-disable-line react/no-danger
      />
    );
  };
}

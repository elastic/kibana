/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  static title = i18n.translate('fieldFormats.color.colorOrBadgeTitle', {
    defaultMessage: 'Color / Badge',
  });
  static fieldType = [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING, KBN_FIELD_TYPES.BOOLEAN];

  getParamDefaults() {
    return {
      fieldType: null, // populated by editor, see controller below
      colors: [cloneDeep(DEFAULT_CONVERTER_COLOR)],
    };
  }

  findColorRuleForVal(val: string | number | boolean) {
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
          // @ts-expect-error upgrade typescript v5.1.6
          return val >= Number(start) && val <= Number(end);
        });

      case 'boolean':
        return findLast(this.param('colors'), ({ boolean }) => {
          return boolean === val.toString();
        });

      default:
        return null;
    }
  }

  htmlConvert: HtmlContextTypeConvert = (val: string | number, options) => {
    const color = this.findColorRuleForVal(val) as typeof DEFAULT_CONVERTER_COLOR;

    const displayVal = escape(asPrettyString(val, options));
    if (!color) return displayVal;

    return ReactDOM.renderToStaticMarkup(
      <span
        // using `style` so we can test with jest and emotion does not work for these formatter utils
        // EuiBadge is not multiline, so we define custom styles here instead of using it.
        style={{
          color: color.text,
          backgroundColor: color.background,
          display: 'inline-block',
          padding: '0 8px',
          borderRadius: '3px',
        }}
        dangerouslySetInnerHTML={{ __html: displayVal }} // eslint-disable-line react/no-danger
      />
    );
  };
}

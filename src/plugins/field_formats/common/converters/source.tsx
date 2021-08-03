/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import React, { Fragment } from 'react';
import ReactDOM from 'react-dom/server';
import { escape, keys } from 'lodash';
import { shortenDottedString } from '../utils';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, HtmlContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';

interface Props {
  defPairs: Array<[string, string]>;
}
const TemplateComponent = ({ defPairs }: Props) => {
  return (
    <dl className={'source truncate-by-height'}>
      {defPairs.map((pair, idx) => (
        <Fragment key={idx}>
          <dt
            dangerouslySetInnerHTML={{ __html: `${escape(pair[0])}:` }} // eslint-disable-line react/no-danger
          />
          <dd
            dangerouslySetInnerHTML={{ __html: `${pair[1]}` }} // eslint-disable-line react/no-danger
          />{' '}
        </Fragment>
      ))}
    </dl>
  );
};

export class SourceFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS._SOURCE;
  static title = '_source';
  static fieldType = KBN_FIELD_TYPES._SOURCE;

  textConvert: TextContextTypeConvert = (value) => JSON.stringify(value);

  htmlConvert: HtmlContextTypeConvert = (value, options = {}) => {
    const { field, hit, indexPattern } = options;

    if (!field) {
      const converter = this.getConverterFor('text') as Function;

      return escape(converter(value));
    }

    const highlights = (hit && hit.highlight) || {};
    const formatted = indexPattern.formatHit(hit);
    const highlightPairs: any[] = [];
    const sourcePairs: any[] = [];
    const isShortDots = this.getConfig!(FORMATS_UI_SETTINGS.SHORT_DOTS_ENABLE);

    keys(formatted).forEach((key) => {
      const pairs = highlights[key] ? highlightPairs : sourcePairs;
      const newField = isShortDots ? shortenDottedString(key) : key;
      const val = formatted[key];
      pairs.push([newField, val]);
    }, []);

    return ReactDOM.renderToStaticMarkup(
      <TemplateComponent defPairs={highlightPairs.concat(sourcePairs)} />
    );
  };
}

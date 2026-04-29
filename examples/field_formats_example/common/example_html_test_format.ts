/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { escape } from 'lodash';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import type {
  HtmlContextTypeConvert,
  ReactContextTypeSingleConvert,
  TextContextTypeConvert,
} from '@kbn/field-formats-plugin/common';

const WRAPPER_CLASS = 'ffExampleHtmlTest';

/**
 * Demonstrates a formatter that still defines deprecated `htmlConvert` alongside
 * `reactConvertSingle`, for manually testing legacy Lens (metric / data table)
 * after consumers move from HTML injection to React rendering
 * (see https://github.com/elastic/kibana/pull/266033).
 */
export class ExampleHtmlTestFormat extends FieldFormat {
  static id = 'example-html-test';
  static title = 'HTML test (example)';
  static fieldType = [KBN_FIELD_TYPES.STRING, KBN_FIELD_TYPES.NUMBER];

  textConvert: TextContextTypeConvert = (val) => `[html-test] ${String(val)}`;

  /**
   * @deprecated Intentional for migration testing; use `reactConvertSingle` in real formatters.
   */
  htmlConvert: HtmlContextTypeConvert = (val) => {
    return `<span class="${WRAPPER_CLASS}">${escape(String(val))}</span>`;
  };

  reactConvertSingle: ReactContextTypeSingleConvert = (val) => {
    return React.createElement('span', { className: WRAPPER_CLASS }, String(val));
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { I18N_CALL_PATTERN } from './constants';

describe('I18N_CALL_PATTERN', () => {
  it.each([
    ["import { i18n } from '@kbn/i18n';"],
    ["import { FormattedMessage } from '@kbn/i18n-react';"],
    ["i18n.translate('id', { defaultMessage: 'msg' })"],
    ["I18n.translate('id', { defaultMessage: 'msg' })"],
    ["intl.formatMessage({ id: 'id', defaultMessage: 'msg' })"],
    ["const { formatMessage } = intl;\nformatMessage({ id: 'id', defaultMessage: 'msg' })"],
    ['defineMessages({ id: { defaultMessage: "msg" } })'],
    ["<FormattedMessage id='id' defaultMessage='msg' />"],
    ["const { translate } = i18n;\ntranslate('id', { defaultMessage: 'msg' })"],
    ["translate('id', { defaultMessage: 'msg' })"],
  ])('matches i18n source: %s', (source) => {
    expect(I18N_CALL_PATTERN.test(source)).toBe(true);
  });

  it.each([['const x = 1 + 2;'], ['export function helper() { return true; }']])(
    'does not match non-i18n source: %s',
    (source) => {
      expect(I18N_CALL_PATTERN.test(source)).toBe(false);
    }
  );
});

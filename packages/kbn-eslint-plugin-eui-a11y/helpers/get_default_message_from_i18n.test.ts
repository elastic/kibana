/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@typescript-eslint/parser';
import { getDefaultMessageFromI18n } from './get_default_message_from_i18n';

describe('getDefaultMessageFromI18n', () => {
  it('should return the default message if it exists', () => {
    expect(
      getDefaultMessageFromI18n(
        (parse('i18n.translate("test", { defaultMessage: "Hello world" })') as any).body[0]
      )
    ).toEqual('Hello world');
  });

  it('should return an empty string if there is no default message', () => {
    expect(
      getDefaultMessageFromI18n(
        (parse('i18n.translate("test", { defaultMessage: "" })') as any).body[0]
      )
    ).toEqual('');
  });

  it('should return an empty string if the function is not an i18n function', () => {
    expect(
      getDefaultMessageFromI18n(
        (parse('i19n.translate("test", { defaultMessage: "" })') as any).body[0]
      )
    ).toEqual('');
  });
});

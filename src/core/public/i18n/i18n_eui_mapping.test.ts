/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import i18ntokens from '@elastic/eui/i18ntokens.json';
import { getEuiContextMapping } from './i18n_eui_mapping';

test('all tokens are mapped', () => {
  // Extract the tokens from the EUI library: We need to uniq them because they might be duplicated
  const euiTokensFromLib = [...new Set(i18ntokens.map(({ token }) => token))];
  const euiTokensFromMapping = Object.keys(getEuiContextMapping());

  expect(euiTokensFromMapping.sort()).toStrictEqual(euiTokensFromLib.sort());
});

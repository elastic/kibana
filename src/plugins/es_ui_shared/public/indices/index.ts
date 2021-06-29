/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from './constants';

import {
  indexNameBeginsWithPeriod,
  findIllegalCharactersInIndexName,
  indexNameContainsSpaces,
} from './validate';

export const indices = {
  INDEX_ILLEGAL_CHARACTERS_VISIBLE,
  indexNameBeginsWithPeriod,
  findIllegalCharactersInIndexName,
  indexNameContainsSpaces,
};

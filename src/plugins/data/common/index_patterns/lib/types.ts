/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const ILLEGAL_CHARACTERS_KEY = 'ILLEGAL_CHARACTERS';
export const CONTAINS_SPACES_KEY = 'CONTAINS_SPACES';
export const ILLEGAL_CHARACTERS_VISIBLE = ['\\', '/', '?', '"', '<', '>', '|'];
export const ILLEGAL_CHARACTERS = ILLEGAL_CHARACTERS_VISIBLE.concat(' ');

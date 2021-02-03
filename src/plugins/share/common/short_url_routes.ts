/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const GOTO_PREFIX = '/goto';

export const getUrlIdFromGotoRoute = (path: string) =>
  path.match(new RegExp(`${GOTO_PREFIX}/(.*)$`))?.[1];

export const getGotoPath = (urlId: string) => `${GOTO_PREFIX}/${urlId}`;

export const GETTER_PREFIX = '/api/short_url';

export const getUrlPath = (urlId: string) => `${GETTER_PREFIX}/${urlId}`;

export const CREATE_PATH = '/api/shorten_url';

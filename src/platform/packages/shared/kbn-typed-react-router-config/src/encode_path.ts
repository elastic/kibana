/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const encodePath = (path: string, pathParams?: Record<string, string>) =>
  pathParams && Object.keys(pathParams).length > 0
    ? path
        .split('/')
        .map((part) => {
          const match = part.match(/(?:{([a-zA-Z]+)})/);
          return match && pathParams[match[1]] ? encodeURIComponent(pathParams[match[1]]) : part;
        })
        .join('/')
    : path;

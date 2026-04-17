/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Project routing expression that restricts requests to the origin project only.
 */
export const PROJECT_ROUTING_ORIGIN = '_alias:_origin';

/**
 * Project routing expression that allows requests across all projects.
 */
export const PROJECT_ROUTING_ALL = '_alias:*';

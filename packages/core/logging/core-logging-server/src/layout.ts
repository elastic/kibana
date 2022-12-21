/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Configuration of a logging layout.
 * See {@link JsonLayoutConfigType} and {@link PatternLayoutConfigType}
 * @public
 */
export type LayoutConfigType = PatternLayoutConfigType | JsonLayoutConfigType;

/**
 * Configuration of a json layout
 * @public
 */
export interface JsonLayoutConfigType {
  type: 'json';
}

/**
 * Configuration of a pattern layout
 * @public
 */
export interface PatternLayoutConfigType {
  type: 'pattern';
  highlight?: boolean;
  pattern?: string;
}

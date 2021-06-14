/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export interface ElementSpec {
  name: string;
  icon?: string;
  expression: string;
  displayName?: string;
  type?: string;
  help?: string;
  filter?: string;
  width?: number;
  height?: number;
}

export type ElementFactory = () => ElementSpec;

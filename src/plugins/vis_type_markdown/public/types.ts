/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Style } from '@kbn/expressions-plugin/public';

export interface Arguments {
  markdown: string;
  font: Style;
  openLinksInNewTab: boolean;
}

export interface MarkdownVisParams {
  markdown: Arguments['markdown'];
  openLinksInNewTab: Arguments['openLinksInNewTab'];
  fontSize: number;
}

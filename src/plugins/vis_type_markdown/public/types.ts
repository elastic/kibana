/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Style } from 'src/plugins/expressions/public';

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

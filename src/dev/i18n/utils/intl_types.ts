/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface OptionalFormatPatternNode {
  type: 'optionalFormatPattern';
  selector: string;
  value: any;
}

export interface LinePosition {
  offset: number;
  line: number;
  column: number;
}

export interface LocationNode {
  start: LinePosition;
  end: LinePosition;
}

export interface SelectFormatNode {
  type: 'selectFormat';
  options: OptionalFormatPatternNode[];
  location: LocationNode;
}

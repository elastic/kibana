/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum ColorSchemas {
  Blues = 'Blues',
  Greens = 'Greens',
  Greys = 'Greys',
  Reds = 'Reds',
  YellowToRed = 'Yellow to Red',
  GreenToRed = 'Green to Red',
}

export interface ColorSchema {
  value: ColorSchemas;
  text: string;
}

export interface RawColorSchema {
  id: ColorSchemas;
  label: string;
  value: Array<[number, number[]]>;
}

export interface ColorMap {
  [key: string]: RawColorSchema;
}

export interface ColorSchemaParams {
  colorSchema: ColorSchemas;
  invertColors: boolean;
}

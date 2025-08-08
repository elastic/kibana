/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Defines explicit color specified as a CSS color datatype (rgb/a,hex,keywords,lab,lch etc)
 */
export interface ColorCode {
  type: 'colorCode';
  colorCode: string;
}

/**
 * Defines categorical color based on the index position of color in palette defined by the paletteId
 */
export interface CategoricalColor {
  type: 'categorical';
  paletteId: string;
  colorIndex: number;
}

/**
 * Defines color based on looping round-robin assignment
 */
export interface LoopColor {
  type: 'loop';
}

/**
 * Specify that the Color in an Assignment needs to be taken from a gradient defined in the `Config.colorMode`
 */
export interface GradientColor {
  type: 'gradient';
}

export type Color = ColorCode | CategoricalColor | LoopColor | GradientColor;

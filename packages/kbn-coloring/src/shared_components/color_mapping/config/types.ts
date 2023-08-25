/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type Color = string;

export interface ColorCode {
  type: 'colorCode';
  colorCode: Color;
}

export interface CategoricalColor {
  type: 'categorical';
  paletteId: string;
  colorIndex: number;
}

export interface GradientColor {
  type: 'gradient';
}

export interface RuleAuto {
  /* tag */
  type: 'auto';
}
export interface RuleMatchExactly {
  /* tag */
  type: 'matchExactly';
  values: Array<string | string[]>;
}

export interface RuleMatchExactlyCI {
  /* tag */
  type: 'matchExactlyCI';
  values: string[];
}

export interface RuleRange {
  /* tag */
  type: 'range';
  /**
   * The min value of the range
   */
  min: number;
  /**
   * The max value of the range
   */
  max: number;
  /**
   * `true` if the range is left-closed (the `min` value is considered within the range), false otherwise (only values that are
   * greater than the `min` are considered within the range)
   */
  minInclusive: boolean;
  /**
   * `true` if the range is right-closed (the `max` value is considered within the range), false otherwise (only values less than
   * the `max` are considered within the range)
   */
  maxInclusive: boolean;
}
export interface RuleRegExp {
  /* tag */
  type: 'regex';
  /**
   * TODO: not sure how we can store a regexp
   */
  values: string;
}

// TODO: add RulerForSomeOtherFormOfObject
export interface RuleOthers {
  /* tag */
  type: 'other';
}

export interface Assignment<R, C> {
  /**
   * Describe the rule used to assign the color.
   */
  rule: R;
  /**
   * The color definition
   */
  color: C;

  /**
   * Specify if the color was changed from the original one
   * TODO: rename
   */
  touched: boolean;
}

export interface Config {
  paletteId: string;
  colorMode:
    | { type: 'categorical' }
    | {
        type: 'gradient';
        steps: Array<(CategoricalColor | ColorCode) & { touched: boolean }>;
        sort: 'asc' | 'desc';
      };
  assignmentMode: 'auto' | 'manual';
  assignments: Array<
    Assignment<
      RuleAuto | RuleMatchExactly | RuleMatchExactlyCI | RuleRange | RuleRegExp,
      CategoricalColor | ColorCode | GradientColor
    >
  >;
  specialAssignments: Array<Assignment<RuleOthers, CategoricalColor | ColorCode>>;
}

export interface CategoricalPalette {
  id: string;
  name: string;
  type: 'categorical';
  colorCount: number;
  getColor: (valueInRange: number, isDarkMode: boolean) => Color;
}

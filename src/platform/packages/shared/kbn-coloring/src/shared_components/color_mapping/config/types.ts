/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A color specified as a CSS color datatype (rgb/a,hex,keywords,lab,lch etc)
 */
export interface ColorCode {
  type: 'colorCode';
  colorCode: string;
}

/**
 * An index specified categorical color, coming from paletteId
 */
export interface CategoricalColor {
  type: 'categorical';
  paletteId: string;
  colorIndex: number;
}

/**
 * Specify that the Color in an Assignment needs to be taken from a gradient defined in the `Config.colorMode`
 */
export interface GradientColor {
  type: 'gradient';
}

/**
 * An index specified categorical color, coming from paletteId
 */
export interface LoopColor {
  type: 'loop';
}

/**
 * A special rule that match automatically, in order, all the categories that are not matching a specified rule
 */
export interface RuleAuto {
  /* tag */
  type: 'auto';
}
/**
 * A rule that match exactly, case sensitive, with the provided strings
 */
export interface RuleMatchExactly {
  /* tag */
  type: 'matchExactly';
  values: Array<string | string[]>;
}

/**
 * A Match rule to match the values case insensitive
 * @ignore not used yet
 */
export interface RuleMatchExactlyCI {
  /* tag */
  type: 'matchExactlyCI';
  values: string[];
}

/**
 * A range rule, not used yet, but can be used for numerical data assignments
 */
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
/**
 * Regex rule.
 * @ignore not used yet
 */
export interface RuleRegExp {
  /* tag */
  type: 'regex';
  /**
   * TODO: not sure how we can store a regexp
   */
  values: string;
}

/**
 * A specific catch-everything-else rule
 */
export interface RuleOthers {
  /* tag */
  type: 'other';
}

/**
 * An assignment is the connection link between a rule and a color
 */
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

export interface CategoricalColorMode {
  type: 'categorical';
}
export interface GradientColorMode {
  type: 'gradient';
  steps: Array<(CategoricalColor | ColorCode) & { touched: boolean }>;
  sort: 'asc' | 'desc';
}

export interface Config {
  paletteId: string;
  colorMode: CategoricalColorMode | GradientColorMode;
  assignments: Array<
    Assignment<
      RuleAuto | RuleMatchExactly | RuleMatchExactlyCI | RuleRange | RuleRegExp,
      CategoricalColor | ColorCode | GradientColor
    >
  >;
  specialAssignments: Array<Assignment<RuleOthers, CategoricalColor | ColorCode | LoopColor>>;
}

export interface CategoricalPalette {
  id: string;
  name: string;
  type: 'categorical';
  colorCount: number;
  getColor: (valueInRange: number, isDarkMode: boolean, loop: boolean) => string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CategoricalColor, Color, ColorCode, GradientColor, LoopColor } from './colors';
import { ColorRule, RuleOthers } from './rules';

/**
 * An assignment is the connection link between a rule and a color
 */
export interface AssignmentBase<R extends ColorRule | RuleOthers, C extends Color> {
  /**
   * Describe the rule used to assign the color.
   */
  rules: R[];
  /**
   * The color definition
   */
  color: C;
  /**
   * Specify if the color was changed from the original one
   */
  touched: boolean;
}

export type ColorStep = (CategoricalColor | ColorCode) & {
  /**
   * A flag to know when assignment has been edited since last saved
   */
  touched: boolean;
};

export interface CategoricalColorMode {
  type: 'categorical';
}

export interface GradientColorMode {
  type: 'gradient';
  steps: ColorStep[];
  sort: 'asc' | 'desc';
}

interface BaseConfig {
  paletteId: string;
  specialAssignments: Array<AssignmentBase<RuleOthers, CategoricalColor | ColorCode | LoopColor>>;
}

/**
 * Gradient color mapping config
 */
export interface GradientConfig extends BaseConfig {
  colorMode: GradientColorMode;
  assignments: Array<AssignmentBase<ColorRule, GradientColor>>;
}

/**
 * Categorical color mapping config
 */
export interface CategoricalConfig extends BaseConfig {
  colorMode: CategoricalColorMode;
  assignments: Array<AssignmentBase<ColorRule, CategoricalColor | ColorCode>>;
}

/**
 * Polymorphic color mapping config
 *
 * Merges `GradientConfig` and `CategoricalConfig` for simplicity of type alignment
 */
export type Config = BaseConfig & {
  colorMode: CategoricalColorMode | GradientColorMode;
  assignments: Array<AssignmentBase<ColorRule, CategoricalColor | ColorCode | GradientColor>>;
};

export type Assignment = Config['assignments'][number];
export type SpecialAssignment = BaseConfig['specialAssignments'][number];

export * from './colors';
export * from './rules';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * BUILD-TIME TYPE VALIDATION
 *
 * Ensures the duplicated types in `packaging/react/types.ts` remain compatible
 * with the source types. Compiled during packaging builds via
 * `packaging/tsconfig.json` with `--noEmit`.
 *
 * - Imports types (and value signatures) from BOTH source and packaged locations.
 * - Every check is bidirectional, so TypeScript fails the build if the
 *   standalone types drift from the source in either direction.
 *
 * This file is excluded from regular Kibana development via `TS_PROJECTS`.
 *
 * @see {@link ../tsconfig.json} for the build configuration.
 * @see {@link ./types.ts} for the standalone type definitions.
 */

// Source types and values.
import type * as Source from '../..';

// Packaged types and declarations.
import type * as Packaged from './types';

/** `true` only when `A` and `B` are mutually assignable. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const _aiButtonVariant: Same<Source.AiButtonVariant, Packaged.AiButtonVariant> = true;
const _aiButtonIconType: Same<Source.AiButtonIconType, Packaged.AiButtonIconType> = true;
const _aiButtonProps: Same<Source.AiButtonProps, Packaged.AiButtonProps> = true;
const _aiButtonDefaultProps: Same<Source.AiButtonDefaultProps, Packaged.AiButtonDefaultProps> =
  true;
const _aiButtonEmptyProps: Same<Source.AiButtonEmptyProps, Packaged.AiButtonEmptyProps> = true;
const _aiButtonIconProps: Same<Source.AiButtonIconProps, Packaged.AiButtonIconProps> = true;
const _aiIconProps: Same<Source.AiIconProps, Packaged.AiIconProps> = true;
const _gradientOptions: Same<Source.AiButtonGradientOptions, Packaged.AiButtonGradientOptions> =
  true;
const _gradientStyles: Same<Source.AiButtonGradientStyles, Packaged.AiButtonGradientStyles> = true;
const _gradientColors: Same<Source.AiGradientColors, Packaged.AiGradientColors> = true;
const _svgAiGradient: Same<Source.SvgAiGradient, Packaged.SvgAiGradient> = true;
const _svgAiGradientDefsProps: Same<
  Source.SvgAiGradientDefsProps,
  Packaged.SvgAiGradientDefsProps
> = true;

// Exported values: the packaged declarations must match the source signatures.
const _aiButton: Same<typeof Source.AiButton, typeof Packaged.AiButton> = true;
const _aiButtonDefault: Same<typeof Source.AiButtonDefault, typeof Packaged.AiButtonDefault> = true;
const _aiButtonEmpty: Same<typeof Source.AiButtonEmpty, typeof Packaged.AiButtonEmpty> = true;
const _aiButtonIcon: Same<typeof Source.AiButtonIcon, typeof Packaged.AiButtonIcon> = true;
const _aiIcon: Same<typeof Source.AiIcon, typeof Packaged.AiIcon> = true;
const _svgAiGradientDefs: Same<typeof Source.SvgAiGradientDefs, typeof Packaged.SvgAiGradientDefs> =
  true;
const _useAiButtonGradientStyles: Same<
  typeof Source.useAiButtonGradientStyles,
  typeof Packaged.useAiButtonGradientStyles
> = true;
const _useSvgAiGradient: Same<typeof Source.useSvgAiGradient, typeof Packaged.useSvgAiGradient> =
  true;

// Every runtime export of the source must be declared by the packaged types.
type SourceValueKeys = {
  [K in keyof typeof Source]: (typeof Source)[K] extends (...args: never[]) => unknown ? K : never;
}[keyof typeof Source];
const _allValuesDeclared: Same<Exclude<SourceValueKeys, keyof typeof Packaged>, never> = true;

void _aiButtonVariant;
void _aiButtonIconType;
void _aiButtonProps;
void _aiButtonDefaultProps;
void _aiButtonEmptyProps;
void _aiButtonIconProps;
void _aiIconProps;
void _gradientOptions;
void _gradientStyles;
void _gradientColors;
void _svgAiGradient;
void _svgAiGradientDefsProps;
void _aiButton;
void _aiButtonDefault;
void _aiButtonEmpty;
void _aiButtonIcon;
void _aiIcon;
void _svgAiGradientDefs;
void _useAiButtonGradientStyles;
void _useSvgAiGradient;
void _allValuesDeclared;

export const TYPE_VALIDATION_PASSED = true;

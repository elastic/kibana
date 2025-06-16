/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { IllustrationEuiColors, amsterdamColors, borealisColors } from './eui_colors';

// A list of illustration file names, corresponding to the SVG and color profile files.
// No doubt this would be dynamically generated in production code.
const ILLUSTRATION_NAMES = ['dashboards', 'no_results'] as const;

/** Unique names of available Illustrations. */
export type IllustrationName = (typeof ILLUSTRATION_NAMES)[number];

const themes = ['amsterdam', 'borealis'] as const;
const modes = ['light', 'dark'] as const;

/** EUI Theme */
export type Theme = (typeof themes)[number];

/** UX Color mode */
export type Mode = (typeof modes)[number];

type Colors = {
  common: Record<string, string>;
} & {
  [key in Mode]: Record<string, string>;
};

/**
 * A collection of colors for an Illustration and any variantion based on theme and color mode.
 */
export type IllustrationColorProfile = {
  id: string;
  common: Record<string, string>;
} & Colors & {
    [key in Theme]: Colors;
  };

/**
 * Dynamically import an SVG from the file system.
 * @param name The name of the Illustration.
 * @returns The entire SVG as a string, or null if the file could not be found.
 */
export const importSVG = async (name: string): Promise<string | null> => {
  try {
    const svg = await import(`!!raw-loader!./${name}.svg`);
    return svg.default;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch illustration "${name}"`, e);
    return null;
  }
};

/**
 * Dynamically import a color profile from the file system.
 * @param name The name of the Illustration.
 * @returns A `IllustrationColorProfile` object, or null if the profile could not be found.
 */
export const importColors = async (name: string): Promise<IllustrationColorProfile | null> => {
  try {
    return await import(`./${name}.json`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to fetch colors for illustration "${name}"`, e);
    return null;
  }
};

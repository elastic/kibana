/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css as reactCSS } from '@emotion/react';
import { css as classCSS } from '@emotion/css';

import { type SerializedStyles } from '@emotion/serialize';
import React, { useEffect } from 'react';

import { amsterdamColors, borealisColors } from './assets';
import {
  type IllustrationColorProfile,
  type IllustrationName,
  type Mode,
  type Theme,
  importColors,
  importSVG,
} from './assets';

type IllustrationStyles = {
  [theme in Theme]: {
    [mode in Mode]: string | SerializedStyles;
  };
};

export interface Illustration {
  svg: string;
  styles: IllustrationStyles | null;
}

const buildStyles = (
  colors: IllustrationColorProfile,
  isLocal = false
): IllustrationStyles | null => {
  // In the unlikely event the image is being displayed in a local context, we use the class CSS
  // to avoid polluting the global variables.
  const css = isLocal ? classCSS : reactCSS;
  const root = isLocal ? '&' : ':root';
  const amsterdam = isLocal ? amsterdamColors : {};
  const borealis = isLocal ? borealisColors : {};

  try {
    return {
      amsterdam: {
        light: css`
          ${root} {
            ${Object.entries({
              ...amsterdam,
              ...colors.common,
              ...colors.light,
              ...colors.amsterdam.common,
              ...colors.amsterdam.light,
            }).map(([key, value]) => `${key}: ${value};`)}
          }
        `,
        dark: css`
          ${root} {
            ${Object.entries({
              ...amsterdam,
              ...colors.common,
              ...colors.dark,
              ...colors.amsterdam.common,
              ...colors.amsterdam.dark,
            }).map(([key, value]) => `${key}: ${value};`)}
          }
        `,
      },
      borealis: {
        light: css`
          ${root} {
            ${Object.entries({
              ...borealis,
              ...colors.common,
              ...colors.light,
              ...colors.borealis.common,
              ...colors.borealis.light,
            }).map(([key, value]) => `${key}: ${value};`)}
          }
        `,
        dark: css`
          ${root} {
            ${Object.entries({
              ...borealis,
              ...colors.common,
              ...colors.dark,
              ...colors.borealis.common,
              ...colors.borealis.dark,
            }).map(([key, value]) => `${key}: ${value};`)}
          }
        `,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to create styles for illustration ${colors.id}`, e);
    return null;
  }
};

const importIllustration = async (name: string, isLocal = false): Promise<Illustration | null> => {
  const [svg, colors] = await Promise.all([importSVG(name), importColors(name)]);

  if (!svg || !colors) {
    return null;
  }

  const styles = buildStyles(colors, isLocal);

  return { svg, styles };
};

export const useIllustration = (name: IllustrationName, isLocal = false) => {
  const [illustration, setIllustration] = React.useState<Illustration | null>(null);

  useEffect(() => {
    if (illustration === null) {
      importIllustration(name, isLocal).then(setIllustration);
    }
  }, [illustration, name, isLocal]);

  return illustration;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable react/no-danger */

import React, { FunctionComponent } from 'react';

import { RenderingMetadata } from '../types';

interface Props {
  url: RenderingMetadata['uiPublicUrl'];
}

interface FontFace {
  family: string;
  variants: Array<{
    style: 'normal' | 'italic';
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    sources: string[];
    unicodeRange?: string;
    format?: string;
  }>;
}

/**
 * `Inter` is the latest version of `Inter UI` and used specifically in v8 of Kibana from EUI Amsterdam
 */
const getInter = (url: string): FontFace => {
  return {
    family: 'Inter',
    variants: [
      {
        style: 'normal',
        weight: 100,
        sources: [`${url}/fonts/inter/Inter-Thin.woff2`, `${url}/fonts/inter/Inter-Thin.woff`],
      },
      {
        style: 'italic',
        weight: 100,
        sources: [
          `${url}/fonts/inter/Inter-ThinItalic.woff2`,
          `${url}/fonts/inter/Inter-ThinItalic.woff`,
        ],
      },
      {
        style: 'normal',
        weight: 200,
        sources: [
          `${url}/fonts/inter/Inter-ExtraLight.woff2`,
          `${url}/fonts/inter/Inter-ExtraLight.woff`,
        ],
      },
      {
        style: 'italic',
        weight: 200,
        sources: [
          `${url}/fonts/inter/Inter-ExtraLightItalic.woff2`,
          `${url}/fonts/inter/Inter-ExtraLightItalic.woff`,
        ],
      },
      {
        style: 'normal',
        weight: 300,
        sources: [`${url}/fonts/inter/Inter-Light.woff2`, `${url}/fonts/inter/Inter-Light.woff`],
      },
      {
        style: 'italic',
        weight: 300,
        sources: [
          `${url}/fonts/inter/Inter-LightItalic.woff2`,
          `${url}/fonts/inter/Inter-LightItalic.woff`,
        ],
      },
      {
        style: 'normal',
        weight: 400,
        sources: [
          `${url}/fonts/inter/Inter-Regular.woff2`,
          `${url}/fonts/inter/Inter-Regular.woff`,
        ],
      },
      {
        style: 'italic',
        weight: 400,
        sources: [`${url}/fonts/inter/Inter-Italic.woff2`, `${url}/fonts/inter/Inter-Italic.woff`],
      },
      {
        style: 'normal',
        weight: 500,
        sources: [`${url}/fonts/inter/Inter-Medium.woff2`, `${url}/fonts/inter/Inter-Medium.woff`],
      },
      {
        style: 'italic',
        weight: 500,
        sources: [
          `${url}/fonts/inter/Inter-MediumItalic.woff2`,
          `${url}/fonts/inter/Inter-MediumItalic.woff`,
        ],
      },
      {
        style: 'normal',
        weight: 600,
        sources: [
          `${url}/fonts/inter/Inter-SemiBold.woff2`,
          `${url}/fonts/inter/Inter-SemiBold.woff`,
        ],
      },
      {
        style: 'italic',
        weight: 600,
        sources: [
          `${url}/fonts/inter/Inter-SemiBoldItalic.woff2`,
          `${url}/fonts/inter/Inter-SemiBoldItalic.woff`,
        ],
      },
      {
        style: 'normal',
        weight: 700,
        sources: [`${url}/fonts/inter/Inter-Bold.woff2`, `${url}/fonts/inter/Inter-Bold.woff`],
      },
      {
        style: 'italic',
        weight: 700,
        sources: [
          `${url}/fonts/inter/Inter-BoldItalic.woff2`,
          `${url}/fonts/inter/Inter-BoldItalic.woff`,
        ],
      },
      {
        style: 'normal',
        weight: 800,
        sources: [
          `${url}/fonts/inter/Inter-ExtraBold.woff2`,
          `${url}/fonts/inter/Inter-ExtraBold.woff`,
        ],
      },
      {
        style: 'italic',
        weight: 800,
        sources: [
          `${url}/fonts/inter/Inter-ExtraBoldItalic.woff2`,
          `${url}/fonts/inter/Inter-ExtraBoldItalic.woff`,
        ],
      },
      {
        style: 'normal',
        weight: 900,
        sources: [`${url}/fonts/inter/Inter-Black.woff2`, `${url}/fonts/inter/Inter-Black.woff`],
      },
      {
        style: 'italic',
        weight: 900,
        sources: [
          `${url}/fonts/inter/Inter-BlackItalic.woff2`,
          `${url}/fonts/inter/Inter-BlackItalic.woff`,
        ],
      },
    ],
  };
};

const getRoboto = (url: string): FontFace => {
  return {
    family: 'Roboto Mono',
    variants: [
      {
        style: 'normal',
        weight: 400,
        format: 'woff2',
        sources: [
          'Roboto Mono',
          'RobotoMono-Regular',
          `${url}/fonts/roboto_mono/RobotoMono-Regular.ttf`,
        ],
        unicodeRange:
          'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
      },
      {
        style: 'italic',
        weight: 400,
        sources: [
          'Roboto Mono Italic',
          'RobotoMono-Italic',
          `${url}/fonts/roboto_mono/RobotoMono-Italic.ttf`,
        ],
        unicodeRange:
          'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
      },
      {
        style: 'normal',
        weight: 700,
        format: 'woff2',
        sources: [
          'Roboto Mono Bold',
          'RobotoMono-Bold',
          `${url}/fonts/roboto_mono/RobotoMono-Bold.ttf`,
        ],
        unicodeRange:
          'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
      },
      {
        style: 'italic',
        weight: 700,
        format: 'woff2',
        sources: [
          'Roboto Mono Bold Italic',
          'RobotoMono-BoldItalic',
          `${url}/fonts/roboto_mono/RobotoMono-BoldItalic.ttf`,
        ],
        unicodeRange:
          'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
      },
    ],
  };
};

export const Fonts: FunctionComponent<Props> = ({ url }) => {
  const sansFont = getInter(url);
  const codeFont = getRoboto(url);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        ${[sansFont, codeFont]
          .flatMap(({ family, variants }) =>
            variants.map(({ style, weight, format, sources, unicodeRange }) => {
              const src = sources
                .map((source) =>
                  source.startsWith(url)
                    ? `url('${source}') format('${format || source.split('.').pop()}')`
                    : `local('${source}')`
                )
                .join(', ');

              return `
        @font-face {
          font-family: '${family}';
          font-style: ${style};
          font-weight: ${weight};
          src: ${src};${
                unicodeRange
                  ? `
          unicode-range: ${unicodeRange};`
                  : ''
              }
        }`;
            })
          )
          .join('\n')}
      `,
      }}
    />
  );
};

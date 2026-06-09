/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';

/**
 * Server-rendered Elastic heart logo used by the boot splash and the
 * legacy browser error screen (see `template.tsx`).
 *
 * The SVG is the "elasticheart" — the Elastic logo pieces arranged
 * inside a heart shape, clipped by nested clip-path groups.
 *
 * Combined with the staggered keyframes in `legacy_styles.css`
 * (`@keyframes kbnLoadingElastic`), the splash animates each of the
 * six colored sections. The animation targets the top-level `<g>`
 * groups via `g:nth-of-type`.
 *
 * We can't render the EUI component itself here: this template is sent
 * to the browser before any JS / Emotion has executed, so the splash
 * must be plain SSR-safe HTML + static CSS.
 *
 * The SVG is intentionally decorative (`aria-hidden`). The loading
 * announcement is owned by the wrapping `role="progressbar"` element in
 * `template.tsx`, matching how `EuiLoadingElastic` advertises itself to
 * assistive tech.
 */
export const Logo: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="144"
    height="144"
    viewBox="0 0 144 144"
    className="kbnLoader"
    aria-hidden="true"
  >
    <defs>
      <clipPath id="clip-0">
        <path
          clipRule="nonzero"
          d="M 44 15 L 135 15 L 135 65 L 44 65 Z M 44 15"
        />
      </clipPath>
      <clipPath id="clip-1">
        <path
          clipRule="nonzero"
          d="M 72 33.199219 C 44 5.101562 6 12.5 6 49 C 6 85.5 72 128.101562 72 128.101562 C 72 128.101562 138.101562 85.5 138.101562 49 C 138.101562 27.503906 124.988281 15.914062 108.382812 15.914062 C 96.867188 15.914062 83.671875 21.488281 72 33.199219"
        />
      </clipPath>
      <clipPath id="clip-2">
        <path
          clipRule="nonzero"
          d="M 10 44 L 102 44 L 102 129 L 10 129 Z M 10 44"
        />
      </clipPath>
      <clipPath id="clip-3">
        <path
          clipRule="nonzero"
          d="M 72 33.199219 C 44 5.101562 6 12.5 6 49 C 6 85.5 72 128.101562 72 128.101562 C 72 128.101562 138.101562 85.5 138.101562 49 C 138.101562 27.503906 124.988281 15.914062 108.382812 15.914062 C 96.867188 15.914062 83.671875 21.488281 72 33.199219"
        />
      </clipPath>
      <clipPath id="clip-4">
        <path
          clipRule="nonzero"
          d="M 15 15 L 51 15 L 51 29 L 15 29 Z M 15 15"
        />
      </clipPath>
      <clipPath id="clip-5">
        <path
          clipRule="nonzero"
          d="M 72 33.199219 C 44 5.101562 6 12.5 6 49 C 6 85.5 72 128.101562 72 128.101562 C 72 128.101562 138.101562 85.5 138.101562 49 C 138.101562 27.503906 124.988281 15.914062 108.382812 15.914062 C 96.867188 15.914062 83.671875 21.488281 72 33.199219"
        />
      </clipPath>
      <clipPath id="clip-6">
        <path
          clipRule="nonzero"
          d="M 6 21 L 52 21 L 52 80 L 6 80 Z M 6 21"
        />
      </clipPath>
      <clipPath id="clip-7">
        <path
          clipRule="nonzero"
          d="M 72 33.199219 C 44 5.101562 6 12.5 6 49 C 6 85.5 72 128.101562 72 128.101562 C 72 128.101562 138.101562 85.5 138.101562 49 C 138.101562 27.503906 124.988281 15.914062 108.382812 15.914062 C 96.867188 15.914062 83.671875 21.488281 72 33.199219"
        />
      </clipPath>
      <clipPath id="clip-8">
        <path
          clipRule="nonzero"
          d="M 94 78 L 130 78 L 130 115 L 94 115 Z M 94 78"
        />
      </clipPath>
      <clipPath id="clip-9">
        <path
          clipRule="nonzero"
          d="M 72 33.199219 C 44 5.101562 6 12.5 6 49 C 6 85.5 72 128.101562 72 128.101562 C 72 128.101562 138.101562 85.5 138.101562 49 C 138.101562 27.503906 124.988281 15.914062 108.382812 15.914062 C 96.867188 15.914062 83.671875 21.488281 72 33.199219"
        />
      </clipPath>
      <clipPath id="clip-10">
        <path
          clipRule="nonzero"
          d="M 92 27 L 139 27 L 139 86 L 92 86 Z M 92 27"
        />
      </clipPath>
      <clipPath id="clip-11">
        <path
          clipRule="nonzero"
          d="M 72 33.199219 C 44 5.101562 6 12.5 6 49 C 6 85.5 72 128.101562 72 128.101562 C 72 128.101562 138.101562 85.5 138.101562 49 C 138.101562 27.503906 124.988281 15.914062 108.382812 15.914062 C 96.867188 15.914062 83.671875 21.488281 72 33.199219"
        />
      </clipPath>
    </defs>
    <g clipPath="url(#clip-0)">
      <g clipPath="url(#clip-1)">
        <path
          fillRule="nonzero"
          fill="rgb(100%, 78.039551%, 18.431091%)"
          fillOpacity="1"
          d="M 51.800781 45.601562 L 92.5 64.101562 L 133.5 28.101562 C 138.398438 3.199219 122.199219 -20.898438 97.398438 -25.800781 C 79.5 -29.300781 61.101562 -21.898438 50.800781 -6.800781 L 44 28.601562 Z M 51.800781 45.601562"
        />
      </g>
    </g>
    <g clipPath="url(#clip-2)">
      <g clipPath="url(#clip-3)">
        <path
          fillRule="nonzero"
          fill="rgb(0%, 69.020081%, 68.235779%)"
          fillOpacity="1"
          d="M 11.601562 80.5 C 11 83.5 10.699219 86.601562 10.699219 89.699219 C 10.699219 115.101562 31.398438 135.699219 56.800781 135.601562 C 72 135.601562 86.199219 128.101562 94.699219 115.5 L 101.5 80.199219 L 92.5 62.898438 L 51.601562 44.300781 Z M 11.601562 80.5"
        />
      </g>
    </g>
    <g clipPath="url(#clip-4)">
      <g clipPath="url(#clip-5)">
        <path
          fillRule="nonzero"
          fill="rgb(94.117737%, 38.038635%, 62.745667%)"
          fillOpacity="1"
          d="M 16.601562 22.199219 L 44.5 28.800781 L 50.601562 -2.898438 C 41 -10.300781 27.101562 -8.398438 19.800781 1.199219 C 15.199219 7.199219 14 15.199219 16.601562 22.199219"
        />
      </g>
    </g>
    <g clipPath="url(#clip-6)">
      <g clipPath="url(#clip-7)">
        <path
          fillRule="nonzero"
          fill="rgb(0%, 62.745667%, 86.274719%)"
          fillOpacity="1"
          d="M 13.898438 21.601562 C 1.398438 25.800781 -7.101562 37.601562 -7.199219 50.800781 C -7.199219 63.5 0.699219 75 12.601562 79.5 L 51.699219 44.199219 L 44.5 28.898438 Z M 13.898438 21.601562"
        />
      </g>
    </g>
    <g clipPath="url(#clip-8)">
      <g clipPath="url(#clip-9)">
        <path
          fillRule="nonzero"
          fill="rgb(56.863403%, 77.6474%, 25.489807%)"
          fillOpacity="1"
          d="M 94.398438 110.199219 C 104.101562 117.5 117.898438 115.5 125.199219 105.800781 C 129.699219 99.898438 130.800781 92.101562 128.300781 85.101562 L 100.5 78.601562 Z M 94.398438 110.199219"
        />
      </g>
    </g>
    <g clipPath="url(#clip-10)">
      <g clipPath="url(#clip-11)">
        <path
          fillRule="nonzero"
          fill="rgb(0%, 45.881653%, 74.118042%)"
          fillOpacity="1"
          d="M 100.5 78.601562 L 131.199219 85.800781 C 143.800781 81.601562 152.199219 69.800781 152.300781 56.601562 C 152.300781 43.898438 144.398438 32.398438 132.5 27.898438 L 92.398438 63 Z M 100.5 78.601562"
        />
      </g>
    </g>
  </svg>
);

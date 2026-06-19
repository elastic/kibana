/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React from 'react';

import iconsAndTextSelected from '../assets/icons_and_text_selected.svg';
import iconsAndTextUnselected from '../assets/icons_and_text_unselected.svg';
import iconsOnlySelected from '../assets/icons_only_selected.svg';
import iconsOnlyUnselected from '../assets/icons_only_unselected.svg';

interface Props {
  showText: boolean;
  selected: boolean;
}

const ILLUSTRATION_BORDER_RADIUS = 2;

const ILLUSTRATIONS = {
  iconsAndText: {
    selected: iconsAndTextSelected,
    unselected: iconsAndTextUnselected,
  },
  iconsOnly: {
    selected: iconsOnlySelected,
    unselected: iconsOnlyUnselected,
  },
} as const;

export const PrimaryNavLabelsIllustration = ({ showText, selected }: Props) => {
  const illustrationSet = showText ? ILLUSTRATIONS.iconsAndText : ILLUSTRATIONS.iconsOnly;
  const illustrationSrc = selected ? illustrationSet.selected : illustrationSet.unselected;

  return (
    <span
      css={css`
        display: inline-flex;
        inline-size: fit-content;
        block-size: fit-content;
        border-radius: ${ILLUSTRATION_BORDER_RADIUS}px;
        overflow: hidden;
        flex-shrink: 0;
      `}
    >
      <img
        src={illustrationSrc}
        alt=""
        aria-hidden={true}
        css={css`
          display: block;
        `}
      />
    </span>
  );
};

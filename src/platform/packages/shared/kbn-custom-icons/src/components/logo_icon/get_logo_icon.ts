/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import defaultIcon from '../../../assets/default.svg';
import openAiIcon from '../../../assets/open_ai.svg';
import darkOpenAiIcon from '../../../assets/open_ai_dark.svg';

export const LOGO_NAMES = ['openAi'] as const;
export type LogoName = (typeof LOGO_NAMES)[number];

const logoIcons: Record<LogoName, string> = {
  openAi: openAiIcon,
};

const darkLogoIcons: Record<LogoName, string> = {
  ...logoIcons,
  openAi: darkOpenAiIcon,
};

export function getLogoIcon(logoName: LogoName | undefined, isDarkMode: boolean = false) {
  if (!logoName) {
    return defaultIcon;
  }
  return (isDarkMode ? darkLogoIcons[logoName] : logoIcons[logoName]) ?? defaultIcon;
}

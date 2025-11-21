/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepIconBase64 } from './get_step_icon_base64';
import { getStepIconSvg } from './get_step_icon_svg';
import { HARDCODED_ICONS } from './icons/hardcoded_icons';

function shouldUseMaskImage(connectorType: string): boolean {
  switch (connectorType) {
    case 'manual':
    case 'alert':
    case 'scheduled':
    case 'http':
    case 'console':
    case 'if':
    case 'foreach':
    case 'parallel':
    case 'merge':
    case 'wait':
    case 'inference':
    case 'email':
    // connector icons, which are monochrome and should be colored with currentColor
    case 'gen-ai':
    case 'bedrock':
      return true;
    default:
      return false;
  }
}

export const getStepIconCssProperties = async (connectorType: string): Promise<string | null> => {
  if (shouldUseMaskImage(connectorType)) {
    const svgString = await getStepIconSvg(connectorType);
    if (svgString) {
      const isInlineSvg = svgString.startsWith('<svg');
      return `mask-image: url(${
        isInlineSvg ? `data:image/svg+xml,${encodeURIComponent(svgString)}` : `${svgString}`
      });
              mask-size: contain;
              background-color: currentColor;`;
    }
  }
  const base64String = await getStepIconBase64({ actionTypeId: connectorType });
  if (base64String) {
    return `background-image: url('data:image/svg+xml;base64,${base64String}');`;
  }

  if (connectorType in HARDCODED_ICONS) {
    return `background-image: url('${
      HARDCODED_ICONS[connectorType as keyof typeof HARDCODED_ICONS]
    }');`;
  }

  return null;
};

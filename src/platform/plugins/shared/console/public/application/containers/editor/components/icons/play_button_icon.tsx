/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiIcon } from '@elastic/eui';
import type { EuiIconProps } from '@elastic/eui';
import PlayButtonSvg from './play_button.svg';
import PlayButtonHoverSvg from './play_button_hover.svg';

export const PlayButtonIcon: React.FC<Omit<EuiIconProps, 'type'>> = (props) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <EuiIcon type={isHovered ? PlayButtonHoverSvg : PlayButtonSvg} {...props} />
    </div>
  );
};

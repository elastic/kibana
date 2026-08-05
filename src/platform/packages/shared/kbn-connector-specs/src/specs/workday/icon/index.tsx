/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';

/**
 * Workday's arc device on its own, cropped to its bounding box. The full lock-up
 * this replaced is a 2:1 wordmark, so scaling it into a 16px step icon left the
 * word unreadable. Workday publishes no square symbol, so the arc is the only
 * element of the mark that survives at icon size.
 */
const WorkdayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="723 0 2778 1033" {...props}>
    <path
      fill="#FC5B05"
      d="m 1173.8204,521.93296 c 250.6,-251 584,-389.2 938.8,-389.2 354.1,0 687.1,137.9 937.5,388.3 143.2,143.2 249.5,313.299 314.4,498.99704 2.8,8 10.2,13.3 18.7,13.3 h 98.4 c 13.4,0 23.1,-13 18.9,-25.8 -70.1,-216.49804 -191,-414.79704 -356.5,-580.39704 C 2868.6204,151.63296 2502.3204,0 2112.8204,0 c -390.2,0 -757.2,152.03296 -1032.9,428.13296 -165.19992,165.4 -285.70092,363.399 -355.60092,579.39704 -4.1,12.8 5.5,25.8 19,25.8 h 98.401 c 8.5,0 15.9,-5.4 18.7,-13.3 64.6,-185.19804 170.59992,-355.09704 313.39992,-498.09704 z"
    />
  </svg>
);

export default (props: ConnectorIconProps) => <EuiIcon type={WorkdayIcon} {...props} />;

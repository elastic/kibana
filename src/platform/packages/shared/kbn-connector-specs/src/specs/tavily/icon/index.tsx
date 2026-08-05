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

// Inlined rather than imported as an asset: Tavily's mark is monochrome and
// `currentColor` only resolves against the theme when the SVG is in the DOM,
// not when it is the `src` of an `<img>`.
const TavilyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M8.033 14.273a1.612 1.612 0 011.139.47l.04.042.044.043a1.61 1.61 0 010 2.277l-3.073 3.073.816.816c.6.6.303 1.627-.525 1.814l-5.159 1.165a1.07 1.07 0 01-.897-.2l-.102-.09a1.07 1.07 0 01-.289-1l1.164-5.158A1.079 1.079 0 013.006 17l.816.817 3.074-3.074a1.612 1.612 0 011.137-.47zM17.042 13.246c0-.85.935-1.366 1.653-.912l4.47 2.824c.336.212.503.562.503.911 0 .35-.167.7-.501.913l-4.472 2.824a1.079 1.079 0 01-1.654-.912v-1.155h-7.027c.37-.4.605-.902.677-1.438l.022-.232a2.65 2.65 0 00-.492-1.669h6.821v-1.154zM8.188 0c.35 0 .7.168.913.503l2.823 4.47a1.079 1.079 0 01-.911 1.655H9.857v6.692h-1.67a2.633 2.633 0 00-1.668.48V6.629H5.365c-.849 0-1.366-.936-.912-1.654L7.276.503A1.072 1.072 0 018.188 0z"
    />
  </svg>
);

export default (props: ConnectorIconProps) => <EuiIcon type={TavilyIcon} {...props} />;

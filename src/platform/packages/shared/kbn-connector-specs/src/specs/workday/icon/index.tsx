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

import { useBrandFill } from '../../../brand_icon';
import type { ConnectorIconProps } from '../../../types';

/**
 * "The Dub", Workday's square mark, in place of the horizontal wordmark that was
 * unreadable once scaled into a 16px step icon. Paths are their published
 * `wd-dub-primary` / `wd-dub-reversed` assets, which differ only in the letter
 * fill — the arc stays orange on both.
 * https://canvas.workday.com/styles/assets/logo-and-the-dub
 */
const WorkdayIcon = ({
  letterFill,
  ...props
}: React.SVGProps<SVGSVGElement> & { letterFill: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" {...props}>
    <path
      fill={letterFill}
      d="M23.2218 31.9968H20.353C19.9226 31.9968 19.569 31.8 19.4522 31.3264L15.9962 19.16L12.5402 31.3296C12.4234 31.8032 12.0698 32 11.6394 32H8.77062C8.30022 32 8.02342 31.8032 7.86982 31.3296C6.02182 26.1968 4.76742 21.096 3.70662 15.9632C3.58982 15.4464 3.82342 15.0928 4.37062 15.0928H6.92582C7.39622 15.0928 7.70982 15.3296 7.79302 15.7632C8.45702 19.4 9.24742 23.1472 10.3082 26.8272L13.3706 15.7632C13.4874 15.3296 13.801 15.0928 14.2714 15.0928H17.7274C18.1978 15.0928 18.5114 15.3296 18.6282 15.7632L21.6906 26.8272C22.7514 23.1568 23.5418 19.4 24.2058 15.7632C24.2826 15.3296 24.5994 15.0928 25.073 15.0928H27.6282C28.1754 15.0928 28.4122 15.4496 28.2922 15.9632C27.2314 21.0976 25.977 26.1968 24.1306 31.3296C23.9706 31.8032 23.697 31.9968 23.2266 31.9968H23.2218Z"
    />
    <path
      fill="#FC5B05"
      d="M9.67946 6.5296C11.3675 4.8384 13.6107 3.9104 15.9995 3.9072C18.3851 3.9072 20.6267 4.8352 22.3099 6.52C23.1867 7.3968 23.8555 8.4224 24.2987 9.5392C24.3995 9.7968 24.6523 9.9664 24.9291 9.9664H27.6283C28.0795 9.9664 28.4123 9.5328 28.2827 9.1024C27.6795 7.104 26.5915 5.2752 25.0763 3.7568C22.6523 1.3376 19.4299 0 16.0027 0C12.5755 0 9.34506 1.3376 6.91946 3.7664C5.40106 5.2848 4.31466 7.1136 3.71626 9.1056C3.58666 9.536 3.91946 9.9696 4.37066 9.9696H7.06986C7.34666 9.9696 7.59786 9.8 7.70026 9.5424C8.14026 8.4272 8.80746 7.4032 9.67946 6.5296Z"
    />
  </svg>
);

export default (props: ConnectorIconProps) => {
  const letterFill = useBrandFill('#0F2E66');
  return (
    <EuiIcon
      type={(iconProps) => <WorkdayIcon letterFill={letterFill} {...iconProps} />}
      {...props}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { FC } from 'react';
import React from 'react';

export const redirectAppLinksStyles = css({
  display: 'inherit',
  height: 'inherit',
  width: 'inherit',
  flex: '1',
  flexFlow: 'column nowrap',
});

/**
 * @deprecated - This component is deprecated and usages of it can be safely removed from your codebase.
 * The link navigation is handled by GlobalRedirectAppLinks component at the root of the application.
 * When removing the usages of this component, make sure to check that your app layout hasn't been affected.
 */
export const RedirectAppLinks: FC<any> = ({
  children,
  navigateToUrl,
  currentAppId,
  ...containerProps
}) => {
  return (
    <div css={redirectAppLinksStyles} data-test-subj="kbnRedirectAppLink" {...containerProps}>
      {children}
    </div>
  );
};

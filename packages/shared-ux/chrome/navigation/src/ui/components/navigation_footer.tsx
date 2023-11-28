/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type FC } from 'react';

export interface Props {
  children?: JSX.Element[];
}

// Note: this component is only used to detect which children are part of the body and which
// are part of the footer. See the "childrenParsed" value of the <Navigation /> component.
export const NavigationFooter: FC<Props> = () => {
  return null;
};

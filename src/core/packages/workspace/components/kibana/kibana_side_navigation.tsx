/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';

export type KibanaSideNavProps = Pick<
  InternalChromeStart['projectNavigation'],
  'getActiveNodes$' | 'getProjectSideNavComponent$'
>;

export const KibanaSideNavigation = ({
  getActiveNodes$,
  getProjectSideNavComponent$,
}: KibanaSideNavProps) => {
  const activeNodes = useObservable(getActiveNodes$(), []);
  const CustomSideNavComponent = useObservable(getProjectSideNavComponent$(), {
    current: null,
  });

  const SideNavComponent = useMemo(() => {
    if (CustomSideNavComponent.current) {
      return CustomSideNavComponent.current;
    }
    return () => null;
  }, [CustomSideNavComponent]);

  return <SideNavComponent activeNodes={activeNodes} />;
};

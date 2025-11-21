/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';
import React, { useCallback } from 'react';
import type { Observable } from 'rxjs';
import type { DeveloperToolbarItemProps, DeveloperToolbarProps } from '@kbn/developer-toolbar';
import { DeveloperToolbar, DeveloperToolbarItem } from '@kbn/developer-toolbar';
import useObservable from 'react-use/lib/useObservable';

export const Toolbar = ({
  items$,
  envInfo,
}: {
  items$: Observable<DeveloperToolbarItemProps[]>;
  envInfo: DeveloperToolbarProps['envInfo'];
}) => {
  const updateLayout = useLayoutUpdate();
  const registeredItems = useObservable(items$) || [];

  const onHeightChange = useCallback(
    (height: number) => {
      updateLayout({
        footerHeight: height,
      });
    },
    [updateLayout]
  );

  return (
    <>
      <DeveloperToolbar envInfo={envInfo} onHeightChange={onHeightChange} />
      {registeredItems.map((item: DeveloperToolbarItemProps) => (
        <DeveloperToolbarItem key={item.id} id={item.id} priority={item.priority}>
          {item.children}
        </DeveloperToolbarItem>
      ))}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default Toolbar;

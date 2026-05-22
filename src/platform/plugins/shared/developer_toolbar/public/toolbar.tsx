/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutUpdate } from '@kbn/ui-chrome-layout';
import React, { useCallback } from 'react';
import type { Observable } from 'rxjs';
import type { DeveloperToolbarItemProps, DeveloperToolbarProps } from '@kbn/developer-toolbar';
import { DeveloperToolbar, DeveloperToolbarItem } from '@kbn/developer-toolbar';
import type { HotkeysStart } from '@kbn/core-hotkeys-browser';
import useObservable from 'react-use/lib/useObservable';

export const Toolbar = ({
  items$,
  envInfo,
  hotkeys,
}: {
  items$: Observable<DeveloperToolbarItemProps[]>;
  envInfo: DeveloperToolbarProps['envInfo'];
  hotkeys: HotkeysStart;
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
      <DeveloperToolbar envInfo={envInfo} onHeightChange={onHeightChange} hotkeys={hotkeys} />
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

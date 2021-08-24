/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useState, useMemo, useEffect, FC } from 'react';
import type { SpacesApi } from '../../../../../x-pack/plugins/spaces/public';
import { SpacesInfo, getSpaceInfo } from '../lib';

interface TableContext {
  spacesInfo?: SpacesInfo;
}

const tableContext = createContext<TableContext>({});

export const useTableContext = () => useContext(tableContext);
export const TableContextConsumer = tableContext.Consumer;

export const TableContextProvider: FC<{ spacesApi?: SpacesApi }> = ({ children, spacesApi }) => {
  const [spacesInfo, setSpacesInfo] = useState<SpacesInfo | undefined>();

  // note: in theory, using conditional statements around context providers is dangerous. However,
  // here we do know that the `spacesApi` state (present or not) will not change at runtime, so it's fine-ish
  const spaceContext = spacesApi ? spacesApi.ui.useSpaces() : undefined;
  useEffect(() => {
    const updateSpacesInfo = async () => {
      if (spaceContext) {
        setSpacesInfo(await getSpaceInfo(spaceContext));
      }
    };
    updateSpacesInfo();
  }, [spaceContext]);

  const context = useMemo(() => {
    return {
      spacesInfo,
    };
  }, [spacesInfo]);

  return <tableContext.Provider value={context}>{children}</tableContext.Provider>;
};

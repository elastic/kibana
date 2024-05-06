/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { TreeChild } from './tree_child';

const TreeChildMemoized = React.memo(TreeChild);

export const JSONTree = ({
  data,
  isDarkMode,
}: {
  data: Record<string, unknown>;
  isDarkMode: boolean;
}) => {
  return (
    <>
      {Object.keys(data).length !== 0 && (
        <TreeChildMemoized node={data} i={0} isDarkMode={isDarkMode} isRootElement />
      )}
    </>
  );
};

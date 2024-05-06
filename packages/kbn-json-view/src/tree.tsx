/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { TreeChild } from './tree_child';

const TreeChildMemoized = React.memo(TreeChild);

export const Tree = ({ data }: { data: EsHitRecord }) => {
  return (
    <>
      {Object.keys(data).length !== 0 &&
        (Array.isArray(data) ? (
          data.map((node, i) => {
            return <TreeChildMemoized key={i} node={node} i={i} isRootElement={true} />;
          })
        ) : (
          <TreeChildMemoized node={data} i={0} />
        ))}
    </>
  );
};

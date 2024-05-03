/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
// import { css } from '@emotion/react';
import { EuiIcon } from '@elastic/eui';

import { TreeKeyValue } from './tree_key_value';
import { Label } from './label';

export const TreeChild = ({
  node,
  i,
  isRootElement,
  parent,
}: {
  node: unknown;
  i: number;
  isRootElement?: boolean;
  parent?: unknown;
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleExpandElement = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const itemLabelProps = {
    node,
    i,
    isRootElement,
    parent,
  };

  return (
    <div>
      <div>
        <button onClick={handleExpandElement}>
          <EuiIcon type="minus" color="primary" />
        </button>
        <span>
          <Label {...itemLabelProps} />
        </span>
      </div>
      {node &&
        Object.keys(node).map((subel, n) => {
          return (
            <div key={n}>
              <div>
                {typeof node[subel] !== 'object' || node[subel] == null ? (
                  <TreeKeyValue key={subel} value={node[subel]} />
                ) : (
                  <TreeChild i={i} node={node[subel]} parent={subel} />
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useState, useEffect } from 'react';

const NO_ACTIONS = [];

export const usePostToolClientActions = (tool: any, dependencies: any) => {
  const [actions, setActions] = useState<any[]>(NO_ACTIONS);

  useEffect(
    function postToolClientActionsEffect() {
      let unmounted = false;
      async function getActions() {
        const postToolClientActions = await tool.getPostToolClientActions(dependencies);
        if (!unmounted) {
          setActions(postToolClientActions);
        }
      }
      getActions();
      return () => {
        unmounted = true;
      };
    },
    [dependencies, tool]
  );
  return actions;
};

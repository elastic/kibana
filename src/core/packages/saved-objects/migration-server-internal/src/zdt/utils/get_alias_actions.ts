/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AliasAction } from '../../actions';

interface GetAliasActionOpts {
  indexPrefix: string;
  currentIndex: string;
  existingAliases: string[];
  kibanaVersion: string;
}

/**
 * Build the list of alias actions to perform, depending on the current state of the cluster.
 */
export const getAliasActions = ({
  indexPrefix,
  currentIndex,
  existingAliases,
  kibanaVersion,
}: GetAliasActionOpts): AliasAction[] => {
  const actions: AliasAction[] = [];

  const globalAlias = indexPrefix;
  const versionAlias = `${indexPrefix}_${kibanaVersion}`;
  const allAliases = [globalAlias, versionAlias];
  allAliases.forEach((alias) => {
    if (!existingAliases.includes(alias)) {
      actions.push({
        add: { index: currentIndex, alias },
      });
    }
  });

  return actions;
};

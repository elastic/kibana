/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface GetAliasActionOpts {
  indexPrefix: string;
  kibanaVersion: string;
}

/**
 * Build the list of alias actions to perform, depending on the current state of the cluster.
 */
export const getCreationAliases = ({
  indexPrefix,
  kibanaVersion,
}: GetAliasActionOpts): string[] => {
  const globalAlias = indexPrefix;
  const versionAlias = `${indexPrefix}_${kibanaVersion}`;
  return [globalAlias, versionAlias];
};

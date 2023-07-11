/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { join } from 'path';
import type { SpecificationTypes } from './types';

export const findTypeDefinition = (
  schema: SpecificationTypes.Model,
  typeName: SpecificationTypes.TypeName
): SpecificationTypes.TypeDefinition | undefined => {
  return schema.types.find(
    (type) => type.name.name === typeName.name && type.name.namespace === typeName.namespace
  );
};

export const createFolderIfDoesntExist = (folder: string, log: ToolingLog) => {
  if (!fs.existsSync(folder)) {
    log.warning(`folder ${folder} doesn't exist, creating a new folder`);
    fs.mkdirSync(folder, { recursive: true });
    log.warning(`created a new folder ${folder}`);
  }
};

export const saveJsonToFile = ({
  folder,
  name,
  fileContent,
}: {
  folder: string;
  name: string;
  fileContent: any;
}) => {
  fs.writeFileSync(
    join(folder, `${name}.json`),
    JSON.stringify(fileContent, null, 2) + '\n',
    'utf8'
  );
};

export const areTypeNamesEqual = (
  typeNameA: SpecificationTypes.TypeName,
  typeNameB: SpecificationTypes.TypeName
): boolean => {
  return typeNameA.name === typeNameB.name && typeNameA.namespace === typeNameB.namespace;
};

export const getCombinedGlobalName = (typeName: SpecificationTypes.TypeName): string => {
  const { name, namespace } = typeName;
  // remove "_global.", "_types." and "._types" from namespace
  const clearedNameSpace = namespace
    .replace('_global.', '')
    .replace('_types.', '')
    .replace('._types', '');
  return `${clearedNameSpace}.${name}`;
};

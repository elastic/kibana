/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import Path, { join } from 'path';
import type { SpecificationTypes } from './types';
import { SpecificationTypes as S } from './types';

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

export const emptyFolder = (folder: string, log: ToolingLog) => {
  const files = fs.readdirSync(folder);
  if (files.length > 0) {
    log.warning(`folder ${folder} already contains files, emptying the folder`);
    for (const file of files) {
      fs.rmSync(Path.resolve(folder, file), { recursive: true });
    }
    log.warning(`folder ${folder} has been emptied`);
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

export const isUnionOfInstanceAndArray = (unionOf: S.UnionOf): boolean => {
  /*
   * often a union is an instance of a type and an array of the same type
   * Example
   * {
            "items": [
              {
                "kind": "instance_of",
                "type": {
                  "name": "QueryContainer",
                  "namespace": "_types.query_dsl"
                }
              },
              {
                "kind": "array_of",
                "value": {
                  "kind": "instance_of",
                  "type": {
                    "name": "QueryContainer",
                    "namespace": "_types.query_dsl"
                  }
                }
              }
            ],
            "kind": "union_of"
          }
   */
  if (unionOf.items.length === 2) {
    const item1 = unionOf.items[0];
    const item2 = unionOf.items[1];
    if (
      item1.kind === 'instance_of' &&
      item2.kind === 'array_of' &&
      item2.value.kind === 'instance_of'
    ) {
      if (areTypeNamesEqual(item1.type, item2.value.type)) {
        return true;
      }
    }
  }
  return false;
};

export const cleanUpConvertedUnionItems = (items: any[]) => {
  return items.filter((item) => !!item && Object.keys(item).length > 0);
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

export const getGlobalScopeLink = (type: S.TypeName) => {
  return {
    __scope_link: `GLOBAL.${getCombinedGlobalName(type)}`,
  };
};

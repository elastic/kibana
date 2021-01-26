/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as ts from 'typescript';
import { getDescriptor, Descriptor, DescriptorValue } from './serializer';

export type InterfaceObjectType = Record<string, Descriptor | DescriptorValue>;

export function getInterfacesDescriptors(
  sourceFile: ts.SourceFile,
  program: ts.Program,
  interfaceName: string
): InterfaceObjectType[] {
  const interfacesObjects: InterfaceObjectType[] = [];
  const typeChecker = program.getTypeChecker();

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      if (ts.getNameOfDeclaration(node)?.getText() === interfaceName) {
        const symbols = typeChecker.getSymbolsInScope(node, ts.SymbolFlags.Interface);

        const symbolDeclaration = symbols
          .find((symbol) => symbol.name === interfaceName)
          ?.getDeclarations()
          ?.find(ts.isInterfaceDeclaration)
          ?.getChildren()
          .filter((child) => child.kind === 334)
          .pop();

        const interfaceObject = symbolDeclaration?.getChildren().reduce((acc, child) => {
          if (ts.isPropertySignature(child)) {
            const childNameText = child.name.getText();
            const key = childNameText.replace(/["']/g, '');
            return { ...acc, [key]: getDescriptor(child, program) };
          }

          throw new Error(`Unrecognized property in interface of kind: ${child.kind}.`);
        }, {} as InterfaceObjectType);

        if (interfaceObject) {
          interfacesObjects.push(interfaceObject);
        }
      }
    }
  });

  return interfacesObjects;
}

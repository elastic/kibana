/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as ts from 'typescript';

export function isPropertyWithKey(property: ts.Node, identifierName: string) {
  if (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) {
    if (ts.isIdentifier(property.name)) {
      return property.name.text === identifierName;
    }
  }

  return false;
}

export function getProperty(objectNode: any, propertyName: string): ts.Node | null {
  let foundProperty = null;
  ts.visitNodes(objectNode?.properties || [], node => {
    if (isPropertyWithKey(node, propertyName)) {
      foundProperty = node;
      return node;
    }
  });

  return foundProperty;
}

export function getPropertyValue(node: ts.Node) {
  if (ts.isPropertyAssignment(node)) {
    if (ts.isStringLiteral(node.initializer)) {
      return node.initializer.getText();
    }
  }
}

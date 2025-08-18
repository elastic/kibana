/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { DATA_PATH_ATTRIBUTE_KEY } from './constants';
import { encodeAttribute } from './encode_attribute';
import type { AddDataPathAttributeOptions } from './types';

/*
  There is no reliable way using static analysis to target components which are not defined in code as JSX elements.
  For example, components that are dynamically created.
  This plugin is not able to add the data-path attribute to such components.
*/
export const addDataPathAttributePlugin = ({
  babel,
  state,
  nodePath,
}: AddDataPathAttributeOptions) => {
  const filename = state.file.opts.filename;
  if (!filename) return;

  let componentName: string | undefined;
  const { node } = nodePath;

  if (babel.isJSXIdentifier(node.name)) {
    componentName = node.name.name;
  } else if (babel.isJSXMemberExpression(node.name)) {
    componentName = node.name.property.name;
  }

  if (componentName === 'Fragment' || babel.isJSXFragment(nodePath.parent)) {
    return;
  }

  const hasDataPathAlready = node.attributes.some(
    (a) =>
      babel.isJSXAttribute(a) && babel.isJSXIdentifier(a.name, { name: DATA_PATH_ATTRIBUTE_KEY })
  );

  if (hasDataPathAlready) return;

  const repoRoot = state.opts.repoRoot;
  const relativePath = path.relative(repoRoot, filename);

  node.attributes.push(
    babel.jsxAttribute(
      babel.jsxIdentifier(DATA_PATH_ATTRIBUTE_KEY),
      babel.stringLiteral(encodeAttribute(relativePath))
    )
  );
};

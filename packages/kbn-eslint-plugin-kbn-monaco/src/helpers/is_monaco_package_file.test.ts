/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMonacoPackageFile } from './is_monaco_package_file';

describe('isMonacoPackageFile', () => {
  it.each([
    '/repo/src/platform/packages/shared/kbn-monaco/src/languages/theming/index.ts',
    '/repo/src/platform/packages/shared/shared-ux/code_editor/impl/react_monaco_editor/editor.tsx',
    'src/platform/packages/shared/kbn-monaco/src/register_globals.ts',
    // the same files on Windows
    'C:\\repo\\src\\platform\\packages\\shared\\kbn-monaco\\src\\index.ts',
    'C:\\repo\\src\\platform\\packages\\shared\\shared-ux\\code_editor\\impl\\code_editor.tsx',
  ])('is true for a file of the packages that own the boundary: %s', (filename) => {
    expect(isMonacoPackageFile(filename)).toBe(true);
  });

  it.each([
    '/repo/x-pack/platform/plugins/shared/some_plugin/public/some_file.tsx',
    // `code_editor` is only the package outside of its `impl` directory by name
    '/repo/x-pack/platform/plugins/shared/code_editor_thing/public/some_file.tsx',
    '/repo/src/platform/packages/shared/shared-ux/code_editor/mocks/monaco_mock/index.tsx',
    // a directory that merely contains the name
    '/repo/packages/kbn-eslint-plugin-kbn-monaco/src/rules/no_direct_monaco_import.ts',
    // a dependency that happens to have a `code_editor/impl` directory
    '/repo/node_modules/some-lib/code_editor/impl/index.js',
  ])('is false for any other file: %s', (filename) => {
    expect(isMonacoPackageFile(filename)).toBe(false);
  });
});

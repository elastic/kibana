/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_viz_naming');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

ruleTester.run('@kbn/eslint/no_viz_naming', rule, {
  valid: [
    // correct spelling
    { code: 'const visEditor = 1;' },
    { code: 'function VisPanel() {}' },
    { code: 'const visualization = true;' },
    // filename without viz is fine
    { code: 'const x = 1;', filename: 'vis_editor.ts' },
    // string literals without viz are fine
    { code: "const key = 'visEditor';" },
    { code: 'if ("visOriginatingApp" in ctx) {}' },
    // lowercase "viz" after "i" is fine to avoid false positives like relativize
    { code: 'const relativize = true;' },
    { code: 'const key = "objectivize";' },
  ],
  invalid: [
    {
      code: 'const vizEditor = 1;',
      errors: [{ messageId: 'noViz' }],
      output: 'const visEditor = 1;',
    },
    {
      code: 'function VizPanel() {}',
      errors: [{ messageId: 'noViz' }],
      output: 'function VisPanel() {}',
    },
    {
      code: 'const vizEditorOriginatingAppUrl = "";',
      errors: [{ messageId: 'noViz' }],
      output: 'const visEditorOriginatingAppUrl = "";',
    },
    {
      code: 'type VizualizationType = string;',
      errors: [{ messageId: 'noViz' }],
      output: 'type VisualizationType = string;',
    },
    {
      code: 'const viz = 1;',
      errors: [{ messageId: 'noViz' }],
      output: 'const vis = 1;',
    },
    {
      code: 'const myViz_config = {};',
      errors: [{ messageId: 'noViz' }],
      output: 'const myVis_config = {};',
    },
    // must preserve type annotations on parameters
    {
      code: 'function foo(isTimeViz: boolean) {}',
      errors: [{ messageId: 'noViz' }],
      output: 'function foo(isTimeVis: boolean) {}',
    },
    {
      code: 'const fn = (vizState: SomeType) => vizState;',
      errors: [{ messageId: 'noViz' }, { messageId: 'noViz' }],
      output: 'const fn = (visState: SomeType) => visState;',
    },
    // string literal violations
    {
      code: "if ('vizEditorOriginatingAppUrl' in ctx) {}",
      errors: [{ messageId: 'noVizLiteral' }],
      output: "if ('visEditorOriginatingAppUrl' in ctx) {}",
    },
    {
      code: 'const key = "vizState";',
      errors: [{ messageId: 'noVizLiteral' }],
      output: 'const key = "visState";',
    },
    {
      code: "const key = 'a\\'viz';",
      errors: [{ messageId: 'noVizLiteral' }],
      output: "const key = 'a\\'vis';",
    },
    // filename violations
    {
      code: 'const x = 1;',
      filename: 'viz_editor.ts',
      errors: [{ messageId: 'noVizFile' }],
    },
    {
      code: 'const x = 1;',
      filename: '/some/path/my_viz_panel.tsx',
      errors: [{ messageId: 'noVizFile' }],
    },
  ],
});

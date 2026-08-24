/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const transformImportMetaUrl = ({ types: t }) => ({
  visitor: {
    Program(path) {
      if (path.scope.hasOwnBinding('require')) {
        path.scope.rename('require');
      }
    },
    MemberExpression(path) {
      const { node } = path;
      if (
        t.isMetaProperty(node.object) &&
        node.object.meta.name === 'import' &&
        node.object.property.name === 'meta' &&
        t.isIdentifier(node.property)
      ) {
        if (node.property.name === 'resolve') {
          path.replaceWith(t.memberExpression(t.identifier('require'), t.identifier('resolve')));
          return;
        }
        if (node.property.name !== 'url') {
          return;
        }
        path.replaceWith(
          t.memberExpression(
            t.callExpression(
              t.memberExpression(
                t.callExpression(t.identifier('require'), [t.stringLiteral('url')]),
                t.identifier('pathToFileURL')
              ),
              [t.identifier('__filename')]
            ),
            t.identifier('href')
          )
        );
      }
    },
  },
});

module.exports = () => ({
  plugins: [transformImportMetaUrl],
  presets: [
    [
      require.resolve('@kbn/babel-preset/node_preset'),
      {
        '@babel/preset-env': {
          // disable built-in filtering, which is more performant but strips the import of `regenerator-runtime` required by EUI
          useBuiltIns: false,
          corejs: false,
        },
      },
    ],
  ],
  overrides: [
    {
      exclude: require('@kbn/babel-preset/styled_components_files').USES_STYLED_COMPONENTS,
      presets: [
        [
          require.resolve('@emotion/babel-preset-css-prop'),
          {
            // Use Babel's compile-time labeling for better test performance
            // This is preferred over Emotion's runtime labeling via stack traces because of performance
            autoLabel: 'always',
            labelFormat: '[local]',
            sourceMap: false,
          },
        ],
      ],
    },
  ],
});

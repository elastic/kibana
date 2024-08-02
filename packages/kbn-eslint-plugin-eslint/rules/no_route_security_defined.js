/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Automatically append security object after path if not defined within router methods',
      category: 'Security Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const validMethods = ['get', 'put', 'delete', 'post'];
        const callee = node.callee;
        const securityObject = `
          security: {
            authz: {
              enabled: false,
              reason: 'This route is opted out from authorization',
            },
          },`;

        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'router' &&
          validMethods.includes(callee.property.name)
        ) {
          const [routeConfig] = node.arguments;

          if (routeConfig && routeConfig.type === 'ObjectExpression') {
            const pathProperty = routeConfig.properties.find(
              (property) => property.key && property.key.name === 'path'
            );

            const securityProperty = routeConfig.properties.find(
              (property) => property.key && property.key.name === 'security'
            );

            if (!securityProperty) {
              context.report({
                node: routeConfig,
                message: 'Security object is missing',
                fix(fixer) {
                  // Find the position to insert the security object
                  const insertPosition = pathProperty.range[1];

                  return fixer.insertTextAfterRange(
                    [insertPosition, insertPosition + 1],
                    `${securityObject}`
                  );
                },
              });
            }
          }
        }
      },
    };
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const handleRouteConfig = (node, context) => {
  const routeConfig = node.arguments[0]; // The route configuration object
  if (routeConfig && routeConfig.type === 'ObjectExpression') {
    const optionsProperty = routeConfig.properties.find(
      (prop) => prop.key && prop.key.name === 'options'
    );
    if (optionsProperty && optionsProperty.value.properties) {
      const tagsProperty = optionsProperty.value.properties.find(
        (prop) => prop.key.name === 'tags'
      );

      const accessTagsFilter = (el) => {
        return (
          (el.type === 'Literal' &&
            typeof el.value === 'string' &&
            el.value.startsWith('access:')) ||
          (el.type === 'TemplateLiteral' && el.quasis[0].value.raw.startsWith('access:'))
        );
      };

      const nonAccessTagsFilter = (el) => {
        return (
          (el.type === 'Literal' &&
            typeof el.value === 'string' &&
            !el.value.startsWith('access:')) ||
          (el.type === 'TemplateLiteral' && !el.quasis[0].value.raw.startsWith('access:'))
        );
      };

      const getAccessPrivilege = (el) => {
        if (el.type === 'Literal') {
          return `'${el.value.split(':')[1]}'`;
        }

        if (el.type === 'TemplateLiteral') {
          const firstQuasi = el.quasis[0].value.raw;

          if (firstQuasi.startsWith('access:')) {
            const staticPart = firstQuasi.split('access:')[1] || '';

            const dynamicParts = el.expressions.map((expression, index) => {
              const dynamicPlaceholder = `\${${expression.name}}`;
              const nextQuasi = el.quasis[index + 1].value.raw || '';
              return `${dynamicPlaceholder}${nextQuasi}`;
            });

            return `\`${staticPart}${dynamicParts.join('')}\``;
          }
        }
      };

      if (tagsProperty && tagsProperty.value.type === 'ArrayExpression') {
        const accessTags = tagsProperty.value.elements.filter(accessTagsFilter);
        const nonAccessTags = tagsProperty.value.elements.filter(nonAccessTagsFilter);

        if (accessTags.length > 0) {
          context.report({
            node: tagsProperty,
            message: `Move 'access' tags to security.authz.requiredPrivileges.`,
            fix(fixer) {
              const accessPrivileges = accessTags.map(getAccessPrivilege);

              const securityConfig = `security: {
                authz: {
                  requiredPrivileges: [${accessPrivileges.map((priv) => priv).join(', ')}],
                },
              }`;

              const sourceCode = context.getSourceCode();
              // const pathProperty = routeConfig.properties.find((prop) => prop.key.name === 'path');

              const fixes = [];
              let remainingOptions = [];

              // If there are non-access tags, keep the 'tags' property with those
              if (nonAccessTags.length > 0) {
                const nonAccessTagsText = `[${nonAccessTags
                  .map((tag) => sourceCode.getText(tag))
                  .join(', ')}]`;
                fixes.push(fixer.replaceText(tagsProperty.value, nonAccessTagsText));
              } else {
                // Check if 'options' will be empty after removing 'tags'
                remainingOptions = optionsProperty.value.properties.filter(
                  (prop) => prop.key.name !== 'tags'
                );

                // If options are empty, replace the entire 'options' with 'security' config
                if (remainingOptions.length === 0) {
                  fixes.push(fixer.replaceText(optionsProperty, securityConfig));
                }
              }

              // If 'options' was replaced or has other properties, insert security separately
              if (remainingOptions.length > 0) {
                // If no non-access tags, remove 'tags'
                const nextToken = sourceCode.getTokenAfter(tagsProperty);

                if (nextToken && nextToken.value === ',') {
                  // Remove the 'tags' property and the trailing comma
                  fixes.push(fixer.removeRange([tagsProperty.range[0], nextToken.range[1]]));
                } else {
                  fixes.push(fixer.remove(tagsProperty));
                }
                fixes.push(fixer.insertTextBefore(optionsProperty, `${securityConfig},`));
              }

              if (nonAccessTags.length && !remainingOptions.length) {
                fixes.push(fixer.insertTextBefore(optionsProperty, `${securityConfig},`));
              }

              return fixes;
            },
          });
        }
      }
    }
  }
};

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Migrate routes with access tags to security config in router methods',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        if (
          (callee.type === 'MemberExpression' &&
            callee.object &&
            callee.object.name === 'router' &&
            ['get', 'post', 'delete', 'put'].includes(callee.property.name)) ||
          (callee.object &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.name === 'router' &&
            callee.object.property.name === 'versioned' &&
            ['get', 'post', 'delete', 'put'].includes(callee.property.name))
        ) {
          handleRouteConfig(node, context);
        }

        if (callee.type === 'MemberExpression' && callee.property.name === 'addVersion') {
          const versionConfig = node.arguments[0];

          if (versionConfig && versionConfig.type === 'ObjectExpression') {
            handleRouteConfig(node, context);
          }
        }
      },
    };
  },
};

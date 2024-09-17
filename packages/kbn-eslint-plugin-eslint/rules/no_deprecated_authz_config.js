/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const routeMethods = ['get', 'put', 'delete', 'post'];
const ACCESS_TAG_PREFIX = 'access:';

const isStringLiteral = (el) => el.type === 'Literal' && typeof el.value === 'string';
const isLiteralAccessTag = (el) => isStringLiteral(el) && el.value.startsWith(ACCESS_TAG_PREFIX);
const isLiteralNonAccessTag = (el) =>
  isStringLiteral(el) && !el.value.startsWith(ACCESS_TAG_PREFIX);

const isTemplateLiteralAccessTag = (el) =>
  el.type === 'TemplateLiteral' && el.quasis[0].value.raw.startsWith(ACCESS_TAG_PREFIX);
const isTemplateLiteralNonAccessTag = (el) =>
  el.type === 'TemplateLiteral' && !el.quasis[0].value.raw.startsWith(ACCESS_TAG_PREFIX);

const maybeReportDisabledSecurityConfig = (node, context, isVersionedRoute = false) => {
  const callee = node.callee;
  const isAddVersionCall =
    callee.type === 'MemberExpression' && callee.property.name === 'addVersion';

  const disabledSecurityConfig = `
    security: {
      authz: {
        enabled: false,
        reason: 'This route is opted out from authorization',
      },
    },`;

  // Skipping root route call intentionally, we will check root route security config in addVersion node traversal
  if (isVersionedRoute && !isAddVersionCall) {
    return;
  }

  if (isVersionedRoute) {
    const [versionConfig] = node.arguments;

    if (versionConfig && versionConfig.type === 'ObjectExpression') {
      const securityInVersion = versionConfig.properties.find(
        (property) => property.key && property.key.name === 'security'
      );

      if (securityInVersion) {
        return;
      }

      let currentNode = node;

      while (
        currentNode &&
        currentNode.type === 'CallExpression' &&
        currentNode.callee.type === 'MemberExpression'
      ) {
        const callee = currentNode.callee;

        if (
          callee.object &&
          callee.object.property &&
          callee.object.property.name === 'versioned' &&
          routeMethods.includes(callee.property.name)
        ) {
          const [routeConfig] = currentNode.arguments;

          if (routeConfig && routeConfig.type === 'ObjectExpression') {
            const securityInRoot = routeConfig.properties.find(
              (property) => property.key && property.key.name === 'security'
            );

            // If security is missing in both the root and the version
            if (!securityInRoot) {
              context.report({
                node: versionConfig,
                message: 'Security config is missing in addVersion call',
                fix(fixer) {
                  const versionProperty = versionConfig.properties.find(
                    (property) => property.key && property.key.name === 'version'
                  );
                  const insertPosition = versionProperty.range[1];

                  return fixer.insertTextAfterRange(
                    [insertPosition, insertPosition + 1],
                    `${disabledSecurityConfig}`
                  );
                },
              });
            }
          }

          break;
        }

        currentNode = callee.object;
      }
    }
  } else {
    const [routeConfig] = node.arguments;
    const securityProperty = routeConfig.properties.find(
      (property) => property.key && property.key.name === 'security'
    );

    if (!securityProperty) {
      const pathProperty = routeConfig.properties.find((prop) => prop.key.name === 'path');
      context.report({
        node: routeConfig,
        message: 'Security config is missing',
        fix(fixer) {
          const insertPosition = pathProperty.range[1];

          return fixer.insertTextAfterRange(
            [insertPosition, insertPosition + 1],
            `${disabledSecurityConfig}`
          );
        },
      });
    }
  }
};

const handleRouteConfig = (node, context, isVersionedRoute = false) => {
  const [routeConfig] = node.arguments;

  if (routeConfig && routeConfig.type === 'ObjectExpression') {
    const optionsProperty = routeConfig.properties.find(
      (prop) => prop.key && prop.key.name === 'options'
    );

    if (!optionsProperty) {
      return maybeReportDisabledSecurityConfig(node, context, isVersionedRoute);
    }

    if (optionsProperty?.value?.properties) {
      const tagsProperty = optionsProperty.value.properties.find(
        (prop) => prop.key.name === 'tags'
      );

      const accessTagsFilter = (el) => isLiteralAccessTag(el) || isTemplateLiteralAccessTag(el);
      const nonAccessTagsFilter = (el) =>
        isLiteralNonAccessTag(el) || isTemplateLiteralNonAccessTag(el);

      const getAccessPrivilege = (el) => {
        if (el.type === 'Literal') {
          return `'${el.value.split(':')[1]}'`;
        }

        if (el.type === 'TemplateLiteral') {
          const firstQuasi = el.quasis[0].value.raw;

          if (firstQuasi.startsWith(ACCESS_TAG_PREFIX)) {
            const staticPart = firstQuasi.split(ACCESS_TAG_PREFIX)[1] || '';

            const dynamicParts = el.expressions.map((expression, index) => {
              const dynamicPlaceholder = `\${${expression.name}}`;
              const nextQuasi = el.quasis[index + 1].value.raw || '';
              return `${dynamicPlaceholder}${nextQuasi}`;
            });

            return `\`${staticPart}${dynamicParts.join('')}\``;
          }
        }
      };

      if (!tagsProperty) {
        return maybeReportDisabledSecurityConfig(node, context, isVersionedRoute);
      }

      if (tagsProperty && tagsProperty.value.type === 'ArrayExpression') {
        const accessTags = tagsProperty.value.elements.filter(accessTagsFilter);
        const nonAccessTags = tagsProperty.value.elements.filter(nonAccessTagsFilter);

        if (!accessTags.length) {
          return maybeReportDisabledSecurityConfig(node, context, isVersionedRoute);
        }

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
};

/**
 * ESLint Rule: Migrate `access` tags in route configurations to `security.authz.requiredPrivileges`.
 *
 * This rule checks for the following in route configurations:
 * 1. If a route (e.g., `router.get()`, `router.post()`) contains an `options` property with `tags`.
 * 2. If `tags` contains any `access:<privilege>` tags, these are moved to `security.authz.requiredPrivileges`.
 * 3. If no `security` configuration exists, it reports an error and suggests adding a default `security` config.
 * 4. It handles both standard routes and versioned routes (e.g., `router.versioned.post()`, `router.addVersion()`).
 * 5. If other non-access tags exist, they remain in `tags`.
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Migrate routes with and without access tags to security config',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: 'code',
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        if (
          callee.type === 'MemberExpression' &&
          callee.object &&
          callee.object.name === 'router' &&
          routeMethods.includes(callee.property.name)
        ) {
          handleRouteConfig(node, context, false);
        }

        if (
          (callee.type === 'MemberExpression' && callee.property.name === 'addVersion') ||
          (callee.object &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.name === 'router' &&
            callee.object.property.name === 'versioned' &&
            routeMethods.includes(callee.property.name))
        ) {
          const versionConfig = node.arguments[0];

          if (versionConfig && versionConfig.type === 'ObjectExpression') {
            handleRouteConfig(node, context, true);
          }
        }
      },
    };
  },
};

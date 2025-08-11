/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure CSS animation properties are wrapped in euiCanAnimate checks and have fallbacks',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [],
    messages: {
      missingCheck: 'CSS animation property should be wrapped in euiCanAnimate check.',
      missingFallback:
        'The animated property [{{propertyName}}] needs a fallback value when animations are disabled.',
      inaccessibleFallback:
        'The property [{{propertyName}}] is animated, but the default value makes the element inaccessible when animations are disabled.',
    },
  },
  create(context) {
    const animationProperties = new Set([
      'animation',
      'animationName',
      'animationDuration',
      'animationTimingFunction',
      'animationDelay',
      'animationIterationCount',
      'animationDirection',
      'animationFillMode',
      'animationPlayState',
      'transition',
      'transitionProperty',
      'transitionDuration',
      'transitionTimingFunction',
      'transitionDelay',
    ]);

    const inaccessibleCss = {
      opacity: [0, '0'],
      visibility: ['hidden'],
      width: [0, '0', '0px'],
      height: [0, '0', '0px'],
    };

    function isOffScreen(propName, propValue, styleContainer) {
      if (!['left', 'right', 'top', 'bottom'].includes(propName)) {
        return false;
      }

      const positionProp = styleContainer.properties.find(
        (p) => p.key.name === 'position' && !p.computed
      );

      if (!positionProp || !['absolute', 'fixed'].includes(positionProp.value.value)) {
        return false;
      }

      if (typeof propValue === 'string') {
        const numericValue = parseInt(propValue, 10);
        // A large negative value is a strong indicator of being positioned off-screen
        return numericValue < -500;
      }

      return false;
    }

    const keyframesMap = new Map();
    const cssAnimationNodes = new Set();

    function getObjectExpressionFromTemplateLiteral(node) {
      const ancestors = context.getAncestors(node);
      const templateLiteral = ancestors.find((a) => a.type === 'TemplateLiteral');
      if (!templateLiteral) return null;

      const cssCall = ancestors.find(
        (a) =>
          a.type === 'TaggedTemplateExpression' &&
          ['css', 'keyframes'].includes(a.tag.name) &&
          a.quasi === templateLiteral
      );
      if (cssCall) return cssCall;

      const styledCall = ancestors.find(
        (a) =>
          a.type === 'TaggedTemplateExpression' &&
          a.tag.type === 'CallExpression' &&
          a.tag.callee.name === 'styled'
      );
      if (styledCall) return styledCall;

      return null;
    }

    return {
      // Find all keyframes definitions and store their animated properties
      TaggedTemplateExpression(node) {
        if (node.tag.type === 'Identifier' && node.tag.name === 'keyframes') {
          const keyframeName = node.parent.id.name;
          const animatedProperties = new Set();
          const template = node.quasi.quasis[0].value.raw;
          const propertyRegex = /([a-zA-Z-]+)\s*:/g;
          let match;
          while ((match = propertyRegex.exec(template)) !== null) {
            animatedProperties.add(match[1]);
          }
          keyframesMap.set(keyframeName, animatedProperties);
        }
      },

      // Find all animation properties inside template literals
      TemplateElement(node) {
        const parentTemplate = context.getAncestors(node).find((a) => a.type === 'TemplateLiteral');
        if (!parentTemplate) return;

        const inEuiCanAnimateBlock = parentTemplate.expressions.some((expr, i) => {
          if (expr.type === 'Identifier' && expr.name === 'euiCanAnimate') {
            const nextQuasi = parentTemplate.quasis[i + 1];
            return nextQuasi && nextQuasi.value.raw.includes(node.value.raw);
          }
          return false;
        });

        const text = node.value.raw;
        const propertyRegex = /([a-zA-Z-]+)\s*:/g;
        let match;
        while ((match = propertyRegex.exec(text)) !== null) {
          const propName = match[1];
          if (animationProperties.has(propName.replace(/^-ms-/, ''))) {
            cssAnimationNodes.add({ node, propName, inEuiCanAnimateBlock });
          }
        }
      },

      'Program:exit'() {
        const styleBlocks = new Map(); // Map of css/styled block to its properties

        for (const { node, propName, inEuiCanAnimateBlock } of cssAnimationNodes) {
          const styleBlock = getObjectExpressionFromTemplateLiteral(node);
          if (!styleBlock) continue;

          if (!styleBlocks.has(styleBlock)) {
            styleBlocks.set(styleBlock, { fallbacks: new Set(), animated: new Set() });
          }

          const properties = styleBlocks.get(styleBlock);
          if (inEuiCanAnimateBlock) {
            properties.animated.add(propName);
          } else {
            properties.fallbacks.add(propName);
          }
        }

        for (const [styleBlock, { fallbacks, animated }] of styleBlocks.entries()) {
          for (const propName of animated) {
            if (
              !fallbacks.has(propName) &&
              !propName.startsWith('animation') &&
              !propName.startsWith('transition')
            ) {
              const animationNode = [...cssAnimationNodes].find(
                (n) =>
                  getObjectExpressionFromTemplateLiteral(n.node) === styleBlock &&
                  n.propName === propName &&
                  n.inEuiCanAnimateBlock
              );
              if (animationNode) {
                context.report({
                  node: animationNode.node,
                  messageId: 'missingFallback',
                  data: { propertyName: propName },
                });
              }
            }
          }
        }
      },

      Property(node) {
        if (node.key.type !== 'Identifier' || !animationProperties.has(node.key.name)) {
          return;
        }

        const ancestors = context.getAncestors();
        const inCssCall = ancestors.some(
          (a) =>
            (a.type === 'CallExpression' &&
              a.callee.type === 'Identifier' &&
              a.callee.name === 'css') ||
            (a.type === 'ObjectExpression' &&
              ancestors.some(
                (p) =>
                  p.type === 'CallExpression' &&
                  p.callee.type === 'MemberExpression' &&
                  p.callee.object.name === 'styled'
              ))
        );
        if (!inCssCall) return;

        const inEuiCanAnimateBlock = ancestors.some(
          (a) => a.type === 'Property' && a.computed && a.key.name === 'euiCanAnimate'
        );

        const styleContainer = ancestors.find((a) => a.type === 'ObjectExpression');
        if (!styleContainer) return;

        if (inEuiCanAnimateBlock) {
          // This property is inside an euiCanAnimate block
          const animatedPropertyName = node.key.name;

          const fallback = styleContainer.properties.find(
            (p) => p.key.name === animatedPropertyName && !p.computed && p !== node
          );

          if (
            !fallback &&
            !animatedPropertyName.startsWith('animation') &&
            !animatedPropertyName.startsWith('transition')
          ) {
            context.report({
              node: node.key,
              messageId: 'missingFallback',
              data: { propertyName: animatedPropertyName },
            });
          }

          const animationNameNode =
            node.value.type === 'TemplateLiteral' && node.value.expressions[0];
          if (animationNameNode && animationNameNode.type === 'Identifier') {
            const animationName = animationNameNode.name;
            const animatedProperties = keyframesMap.get(animationName);

            if (animatedProperties) {
              animatedProperties.forEach((propName) => {
                const fallbackProp = styleContainer.properties.find(
                  (p) => p.key.name === propName && !p.computed
                );

                if (!fallbackProp) {
                  context.report({
                    node: animationNameNode,
                    messageId: 'missingFallback',
                    data: { propertyName: propName },
                  });
                  return;
                }

                if (
                  (inaccessibleCss[propName] &&
                    inaccessibleCss[propName].includes(fallbackProp.value.value)) ||
                  isOffScreen(propName, fallbackProp.value.value, styleContainer)
                ) {
                  context.report({
                    node: fallbackProp.key,
                    messageId: 'inaccessibleFallback',
                    data: { propertyName: propName },
                  });
                }
              });
            }
          }
        } else {
          // This property is NOT inside an euiCanAnimate block
          if (
            (node.value.type === 'Literal' && node.value.value !== 'none') ||
            node.value.type === 'TemplateLiteral'
          ) {
            context.report({ node: node.key, messageId: 'missingCheck' });
          }
        }
      },
    };
  },
};

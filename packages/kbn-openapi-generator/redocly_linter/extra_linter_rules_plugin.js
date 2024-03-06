/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const KNOWN_X_MODIFY_VALUES = ['partial', 'required', 'requiredOptional'];

function ValidXModify() {
  return {
    any: {
      leave(node, ctx) {
        if (typeof node !== 'object' || !('x-modify' in node)) {
          return;
        }

        if (!KNOWN_X_MODIFY_VALUES.includes(node['x-modify']))
          ctx.report({
            message: `Only ${KNOWN_X_MODIFY_VALUES.join(', ')} can be used for x-modify`,
            location: ctx.location.child('x-modify'),
          });
      },
    },
    ref: {
      leave(node, ctx) {
        if (typeof node !== 'object' || !('x-modify' in node)) {
          return;
        }

        if (!KNOWN_X_MODIFY_VALUES.includes(node['x-modify']))
          ctx.report({
            message: `Only ${KNOWN_X_MODIFY_VALUES.join(', ')} can be used for x-modify`,
            location: ctx.location.child('x-modify'),
          });
      },
    },
  };
}

module.exports = {
  id: 'extra-linter-rules-plugin',
  rules: {
    oas3: {
      'valid-x-modify': ValidXModify,
    },
  },
};

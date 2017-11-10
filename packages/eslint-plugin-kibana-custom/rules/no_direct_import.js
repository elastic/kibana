function stripLoaders(request) {
  if (!request.includes('!')) {
    return request;
  }

  // remove webpack loaders from request
  const parts = request.split('!');
  return parts.pop();
}

function parseRequest(request) {
  const fullModule = stripLoaders(request);
  const modules = [];

  if (fullModule.includes('/')) {
    // extract module name from request with sub path
    const parts = fullModule.split('/');
    if (parts[0].startsWith('@')) {
      modules.unshift(`${parts.shift()}/${parts.shift()}`);
    } else {
      modules.unshift(parts.shift());
    }

    while (parts.length) {
      modules.unshift(`${modules[modules.length - 1]}/${parts.shift()}`);
    }
  }

  return {
    request,
    modules,
  };
}

function check(context, node) {
  const [{ blacklist }] = context.options;

  const { request, modules } = parseRequest(node.value);

  const blacklistedModule = modules.find(m => blacklist.hasOwnProperty(m));
  if (!blacklistedModule) {
    return;
  }

  const replacement = blacklist[blacklistedModule];
  if (replacement) {
    context.report({
      node,
      message: `Direct imports of the "{{name}}" are not allowed. Use "{{replacement}}" instead.`,
      data: {
        name: blacklistedModule,
        replacement,
      },
      fix: blacklistedModule === request
        ? fixer => fixer.replaceText(node, `'${replacement}'`)
        : false
    });
  } else {
    context.report({
      node,
      message: `Direct imports of the "{{name}}" are not allowed.`,
      data: {
        name: blacklistedModule
      }
    });
  }
}

module.exports = {
  meta: {
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          blacklist: {
            type: 'object',
            additionalProperties: { 'type': ['string', 'boolean'] }
          }
        },
        additionalProperties: false
      }
    ]
  },

  create: (context) => ({
    CallExpression(node) {
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal'
      ) {
        check(context, node.arguments[0]);
      }
    },
    ImportDeclaration(node) {
      check(context, node.source);
    }
  })
};

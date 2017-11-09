function parseRequest(request) {
  let loaders = null;
  let subPath = null;
  let name = request;

  if (name.includes('!')) {
    // remove webpack loaders from name
    const parts = name.split('!');
    loaders = parts.slice(0, -1).join('!');
    name = parts.pop();
  }

  if (name.includes('/')) {
    // extract module name from request with sub path
    const parts = name.split('/');
    if (parts[0].startsWith('@')) {
      name = `${parts.shift()}/${parts.shift()}`;
    } else {
      name = parts.shift();
    }

    if (parts.length) {
      subPath = parts.join('/');
    }
  }

  return {
    loaders,
    subPath,
    name
  };
}

function check(context, node) {
  const [{ blacklist }] = context.options;

  const req = parseRequest(node.value);

  if (!blacklist.hasOwnProperty(req.name)) {
    return;
  }

  if (blacklist[req.name] && !req.subPath && !req.loaders) {
    context.report({
      node,
      message: `Direct imports of the "{{name}}" are not allowed. Use "{{replacement}}" instead.`,
      data: {
        name: req.name,
        replacement: blacklist[req.name],
      },
      fix(fixer) {
        return fixer.replaceText(node, `'${blacklist[req.name]}'`);
      }
    });
  } else {
    context.report({
      node,
      message: `Direct imports of the "${req.name}" are not allowed.`,
      data: {
        name: req.name
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

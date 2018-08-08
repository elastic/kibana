module.exports = {
  rules: {
    'no-default-export': {
      meta: {
        schema: []
      },
      create: context => ({
        ExportDefaultDeclaration: (node) => {
          context.report(node, 'Default exports not allowed.');
        }
      })
    }
  }
};

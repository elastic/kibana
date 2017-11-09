module.exports = {
  meta: {
    schema: []
  },
  create: context => ({
    ExportDefaultDeclaration: (node) => {
      context.report(node, 'Default exports not allowed.');
    }
  })
};

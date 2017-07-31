module.exports.rules = {
  'no-default-export': context => ({
    ExportDefaultDeclaration: (node) => {
      context.report(node, 'Default exports not allowed.');
    }
  })
};

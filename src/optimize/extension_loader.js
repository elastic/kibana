const dedent = require('dedent');

// We normalize all path separators to `/` in generated files
function normalizePath(path) {
  return path.replace(/[\\\/]+/g, '/');
}

module.exports = function () {
  const { type, modules } = JSON.parse(module.id.split('?').slice(1).join('?') || '{}');

  const requires = modules.map(m => {
    const req = normalizePath(m);
    return `{ req: '${req}', module: require('${req}') },`;
  }).join('        \n');

  return {
    code: dedent`
      // dynamically generated to include uiExports from plugins
      module.exports = [
        // ${type} uiExports
        ${requires}
      ];
    `
  };
};

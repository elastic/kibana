import dedent from 'dedent';

// We normalize all path separators to `/` in generated files
function normalizePath(path) {
  return path.replace(/[\\\/]+/g, '/');
}

export default function () {
  if (module.id.indexOf('?') === -1) {
    throw new Error('create_ui_exports_module loaded without JSON args in module.id');
  }

  const { type, modules } = JSON.parse(module.id.slice(module.id.indexOf('?') + 1));

  const requires = modules
    .sort((a, b) => a.localeCompare(b))
    .map(m => {
      const req = normalizePath(m);
      return `{ req: '${req}', module: require('${req}') },`;
    })
    .join('\n        ');

  return {
    code: dedent`
      // dynamically generated to include uiExports from plugins
      module.exports = [
        // ${type} uiExports
        ${requires}
      ];
    `
  };
}

// We normalize all path separators to `/` in generated files
function normalizePath(path) {
  return path.replace(/[\\\/]+/g, '/');
}

export default function () {
  if (!module.id.includes('?')) {
    throw new Error('create_ui_exports_module loaded without JSON args in module.id');
  }

  const { type, modules } = JSON.parse(module.id.slice(module.id.indexOf('?') + 1));
  const comment = `// dynamically generated to load ${type} uiExports from plugins`;
  const requires = modules
    .sort((a, b) => a.localeCompare(b))
    .map(m => `require('${normalizePath(m)}')`)
    .join('\n        ');

  return {
    code: `${comment}\n${requires}\n`
  };
}

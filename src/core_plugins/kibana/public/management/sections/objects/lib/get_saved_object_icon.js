export function getSavedObjectIcon(type) {
  switch (type) {
    case 'search':
      return 'search';
    case 'visualization':
      return 'visualizeApp';
    case 'dashboard':
      return 'dashboardApp';
    case 'index-pattern':
      return 'indexPatternApp';
    case 'tag':
      return 'apps';
  }
}

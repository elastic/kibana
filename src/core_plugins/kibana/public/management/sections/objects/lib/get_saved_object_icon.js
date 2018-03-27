export function getSavedObjectIcon(type) {
  switch (type) {
    case 'search':
    case 'searches':
      return 'search';
    case 'visualization':
    case 'visualizations':
      return 'visualizeApp';
    case 'dashboard':
    case 'dashboards':
      return 'dashboardApp';
    case 'index-pattern':
    case 'index-patterns':
    case 'indexPatterns':
      return 'indexPatternApp';
    default:
      return 'apps';
  }
}

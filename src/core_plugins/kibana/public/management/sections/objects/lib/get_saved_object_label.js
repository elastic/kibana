export function getSavedObjectLabel(type) {
  switch (type) {
    case 'index-pattern':
    case 'index-patterns':
    case 'indexPatterns':
      return 'index patterns';
    default:
      return type;
  }
}

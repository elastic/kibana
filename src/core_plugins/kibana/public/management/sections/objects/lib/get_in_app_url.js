export function getInAppUrl(id, type) {
  switch (type) {
    case 'search':
    case 'searches':
      return `/discover/${id}`;
    case 'visualization':
    case 'visualizations':
      return `/visualize/edit/${id}`;
    case 'index-pattern':
    case 'index-patterns':
    case 'indexPatterns':
      return `/management/kibana/indices/${id}`;
    case 'dashboard':
    case 'dashboards':
      return `/dashboard/${id}`;
    default:
      return `/${type.toLowerCase()}/${id}`;
  }
}

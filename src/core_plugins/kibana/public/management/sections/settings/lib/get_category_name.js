import { StringUtils } from 'ui/utils/string_utils';

const names = {
  'general': 'General',
  'timelion': 'Timelion',
  'notifications': 'Notifications',
  'visualizations': 'Visualizations',
  'discover': 'Discover',
  'dashboard': 'Dashboard',
  'reporting': 'Reporting',
};

export function getCategoryName(category) {
  return category ? names[category] || StringUtils.upperFirst(category) : '';
}

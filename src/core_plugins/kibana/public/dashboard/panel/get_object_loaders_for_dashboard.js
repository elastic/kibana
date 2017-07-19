import { uiModules } from 'ui/modules';
const module = uiModules.get('app/dashboard');

/**
 * We have more types available than just 'search' and 'visualization' but as of now, they
 * can't be added to a dashboard.
 */
module.factory('getObjectLoadersForDashboard', function (savedSearches, savedVisualizations) {
  return () => [savedSearches, savedVisualizations];
});


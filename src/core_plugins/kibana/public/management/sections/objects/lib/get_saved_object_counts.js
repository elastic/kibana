import chrome from 'ui/chrome';

const apiBase = chrome.addBasePath('/api/kibana/management/saved_objects/scroll');
export async function getSavedObjectCounts($http, typesToInclude, searchString) {
  const results = await $http.post(`${apiBase}/counts`, { typesToInclude, searchString });
  return results.data;
}

import chrome from 'ui/chrome';

const apiBase = chrome.addBasePath('/api/kibana/management/saved_objects/scroll');
export async function scanAllTypes($http, typesToInclude) {
  const results = await $http.post(`${apiBase}/export`, { typesToInclude });
  return results.data;
}


export function getSavedDashboardMock(config) {
  const defaults = {
    id: '123',
    title: 'my dashboard',
    panelsJSON: '[]',
    searchSource: {
      getOwn: (param) => param
    }
  };
  return Object.assign(defaults, config);
}

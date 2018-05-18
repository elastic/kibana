import { getSavedObjectIcon } from '../get_saved_object_icon';

describe('getSavedObjectIcon', () => {
  it('should handle saved searches', () => {
    expect(getSavedObjectIcon('search')).toEqual('search');
    expect(getSavedObjectIcon('searches')).toEqual('search');
  });

  it('should handle visualizations', () => {
    expect(getSavedObjectIcon('visualization')).toEqual('visualizeApp');
    expect(getSavedObjectIcon('visualizations')).toEqual('visualizeApp');
  });

  it('should handle index patterns', () => {
    expect(getSavedObjectIcon('index-pattern')).toEqual('indexPatternApp');
    expect(getSavedObjectIcon('index-patterns')).toEqual('indexPatternApp');
    expect(getSavedObjectIcon('indexPatterns')).toEqual('indexPatternApp');
  });

  it('should handle dashboards', () => {
    expect(getSavedObjectIcon('dashboard')).toEqual('dashboardApp');
    expect(getSavedObjectIcon('dashboards')).toEqual('dashboardApp');
  });

  it('should have a default case', () => {
    expect(getSavedObjectIcon('foo')).toEqual('apps');
  });
});

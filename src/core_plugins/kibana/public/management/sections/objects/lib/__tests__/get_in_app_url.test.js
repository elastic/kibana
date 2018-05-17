import { getInAppUrl } from '../get_in_app_url';

describe('getInAppUrl', () => {
  it('should handle saved searches', () => {
    expect(getInAppUrl(1, 'search')).toEqual('/discover/1');
    expect(getInAppUrl(1, 'searches')).toEqual('/discover/1');
  });

  it('should handle visualizations', () => {
    expect(getInAppUrl(1, 'visualization')).toEqual('/visualize/edit/1');
    expect(getInAppUrl(1, 'visualizations')).toEqual('/visualize/edit/1');
  });

  it('should handle index patterns', () => {
    expect(getInAppUrl(1, 'index-pattern')).toEqual(
      '/management/kibana/indices/1'
    );
    expect(getInAppUrl(1, 'index-patterns')).toEqual(
      '/management/kibana/indices/1'
    );
    expect(getInAppUrl(1, 'indexPatterns')).toEqual(
      '/management/kibana/indices/1'
    );
  });

  it('should handle dashboards', () => {
    expect(getInAppUrl(1, 'dashboard')).toEqual('/dashboard/1');
    expect(getInAppUrl(1, 'dashboards')).toEqual('/dashboard/1');
  });

  it('should have a default case', () => {
    expect(getInAppUrl(1, 'foo')).toEqual('/foo/1');
  });
});

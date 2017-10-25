import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('SavedDashboards Service', function () {
  let savedDashboardLoader;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (savedDashboards) {
    savedDashboardLoader = savedDashboards;
  }));

  it('delete returns a native promise', function () {
    expect(savedDashboardLoader.delete(['1', '2'])).to.be.a(Promise);
  });
});

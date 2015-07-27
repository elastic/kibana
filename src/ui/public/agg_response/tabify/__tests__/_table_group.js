describe('Table Group class', function () {
  var TableGroup;
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    TableGroup = Private(require('ui/agg_response/tabify/_table_group'));
  }));

  it('exposes tables array and empty aggConfig, key and title', function () {
    var tableGroup = new TableGroup();
    expect(tableGroup.tables).to.be.an('array');
    expect(tableGroup.aggConfig).to.be(null);
    expect(tableGroup.key).to.be(null);
    expect(tableGroup.title).to.be(null);
  });
});

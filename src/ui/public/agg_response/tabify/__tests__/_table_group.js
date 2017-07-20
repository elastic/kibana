import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggResponseTabifyTableGroupProvider } from 'ui/agg_response/tabify/_table_group';

describe('Table Group class', function () {
  let TableGroup;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    TableGroup = Private(AggResponseTabifyTableGroupProvider);
  }));

  it('exposes tables array and empty aggConfig, key and title', function () {
    const tableGroup = new TableGroup();
    expect(tableGroup.tables).to.be.an('array');
    expect(tableGroup.aggConfig).to.be(null);
    expect(tableGroup.key).to.be(null);
    expect(tableGroup.title).to.be(null);
  });
});

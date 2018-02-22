import expect from 'expect.js';
import { TableGroup } from 'ui/agg_response/tabify/_table_group';

describe('Table Group class', function () {

  it('exposes tables array and empty aggConfig, key and title', function () {
    const tableGroup = new TableGroup();
    expect(tableGroup.tables).to.be.an('array');
    expect(tableGroup.aggConfig).to.be(null);
    expect(tableGroup.key).to.be(null);
    expect(tableGroup.title).to.be(null);
  });
});

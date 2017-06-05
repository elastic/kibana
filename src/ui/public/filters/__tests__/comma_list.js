import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/filters/comma_list';

describe('Comma-List filter', function () {

  let commaList;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    commaList = $injector.get('commaListFilter');
  }));

  it('converts a string to a pretty list', function () {
    expect(commaList('john,jaine,jim', true)).to.be('john, jaine and jim');
    expect(commaList('john,jaine,jim', false)).to.be('john, jaine or jim');
  });

  it('can accept an array too', function () {
    expect(commaList(['john', 'jaine', 'jim'])).to.be('john, jaine or jim');
  });

  it('handles undefined ok', function () {
    expect(commaList()).to.be('');
  });

  it('handls single values ok', function () {
    expect(commaList(['john'])).to.be('john');
  });

});

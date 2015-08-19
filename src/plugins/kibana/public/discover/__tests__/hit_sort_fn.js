
var _ = require('lodash');
var ngMock = require('ngMock');
var expect = require('expect.js');

describe('hit sort function', function () {
  var createHitSortFn;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    createHitSortFn = Private(require('plugins/kibana/discover/_hit_sort_fn'));
  }));


  var runSortTest = function (dir, sortOpts) {
    var groupSize = _.random(10, 30);
    var total = sortOpts.length * groupSize;

    sortOpts = sortOpts.map(function (opt) {
      if (_.isArray(opt)) return opt;
      else return [opt];
    });
    var sortOptLength = sortOpts.length;

    var hits = _.times(total, function (i) {
      return {
        _source: {},
        sort: sortOpts[i % sortOptLength]
      };
    });

    hits.sort(createHitSortFn(dir))
    .forEach(function (hit, i) {
      var group = Math.floor(i / groupSize);
      expect(hit.sort).to.eql(sortOpts[group]);
    });
  };


  it('sorts a list of hits in ascending order', function () {
    runSortTest('asc', [200, 404, 500]);
  });

  it('sorts a list of hits in descending order', function () {
    runSortTest('desc', [10, 3, 1]);
  });

  it('breaks ties in ascending order', function () {
    runSortTest('asc', [
      [ 'apache',  200,  'facebook.com' ],
      [ 'apache',  200,  'twitter.com'  ],
      [ 'apache',  301,  'facebook.com' ],
      [ 'apache',  301,  'twitter.com'  ],
      [ 'nginx',   200,  'facebook.com' ],
      [ 'nginx',   200,  'twitter.com'  ],
      [ 'nginx',   301,  'facebook.com' ],
      [ 'nginx',   301,  'twitter.com'  ]
    ]);
  });

  it('breaks ties in descending order', function () {
    runSortTest('desc', [
      [ 'nginx',   301,  'twitter.com'  ],
      [ 'nginx',   301,  'facebook.com' ],
      [ 'nginx',   200,  'twitter.com'  ],
      [ 'nginx',   200,  'facebook.com' ],
      [ 'apache',  301,  'twitter.com'  ],
      [ 'apache',  301,  'facebook.com' ],
      [ 'apache',  200,  'twitter.com'  ],
      [ 'apache',  200,  'facebook.com' ]
    ]);
  });
});

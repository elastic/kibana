import expect from 'expect.js';
import propFilter from 'ui/filters/_prop_filter';

describe('prop filter', function () {

  let nameFilter;

  beforeEach(function () {
    nameFilter = propFilter('name');
  });

  it('should keep only the tables', function () {
    const objects = [
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'table',
        title: 'table 2'
      },
      {
        name: 'pie',
        title: 'pie 1'
      }
    ];
    expect(nameFilter(objects, 'table')).to.eql([
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'table',
        title: 'table 2'
      }
    ]);
  });

  it('should support comma-separated values', function () {
    const objects = [
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'line',
        title: 'line 1'
      },
      {
        name: 'pie',
        title: 'pie 1'
      }
    ];
    expect(nameFilter(objects, 'table,line')).to.eql([
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'line',
        title: 'line 1'
      }
    ]);
  });

  it('should support an array of values', function () {
    const objects = [
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'line',
        title: 'line 1'
      },
      {
        name: 'pie',
        title: 'pie 1'
      }
    ];
    expect(nameFilter(objects, [ 'table', 'line' ])).to.eql([
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'line',
        title: 'line 1'
      }
    ]);
  });

  it('should return all objects', function () {
    const objects = [
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'line',
        title: 'line 1'
      },
      {
        name: 'pie',
        title: 'pie 1'
      }
    ];
    expect(nameFilter(objects, '*')).to.eql(objects);
  });

  it('should allow negation', function () {
    const objects = [
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'line',
        title: 'line 1'
      },
      {
        name: 'pie',
        title: 'pie 1'
      }
    ];
    expect(nameFilter(objects, [ '!line' ])).to.eql([
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'pie',
        title: 'pie 1'
      }
    ]);
  });

  it('should support a function for specifying what should be kept', function () {
    const objects = [
      {
        name: 'table',
        title: 'table 1'
      },
      {
        name: 'line',
        title: 'line 1'
      },
      {
        name: 'pie',
        title: 'pie 1'
      }
    ];
    const line = (value) => value === 'line';
    expect(nameFilter(objects, line)).to.eql([
      {
        name: 'line',
        title: 'line 1'
      }
    ]);
  });
});

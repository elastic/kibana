import expect from 'expect.js';
import { propFilter } from 'ui/filters/_prop_filter';

describe('prop filter', function () {
  let nameFilter;

  beforeEach(function () {
    nameFilter = propFilter('name');
  });

  function getObjects(...names) {
    const count = new Map();
    const objects = [];

    for (const name of names) {
      if (!count.has(name)) {
        count.set(name, 1);
      }
      objects.push({
        name: name,
        title: `${name} ${count.get(name)}`
      });
      count.set(name, count.get(name) + 1);
    }
    return objects;
  }

  it('should keep only the tables', function () {
    const objects = getObjects('table', 'table', 'pie');
    expect(nameFilter(objects, 'table')).to.eql(getObjects('table', 'table'));
  });

  it('should support comma-separated values', function () {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, 'table,line')).to.eql(getObjects('table', 'line'));
  });

  it('should support an array of values', function () {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, [ 'table', 'line' ])).to.eql(getObjects('table', 'line'));
  });

  it('should return all objects', function () {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, '*')).to.eql(objects);
  });

  it('should allow negation', function () {
    const objects = getObjects('table', 'line', 'pie');
    expect(nameFilter(objects, [ '!line' ])).to.eql(getObjects('table', 'pie'));
  });

  it('should support a function for specifying what should be kept', function () {
    const objects = getObjects('table', 'line', 'pie');
    const line = (value) => value === 'line';
    expect(nameFilter(objects, line)).to.eql(getObjects('line'));
  });
});

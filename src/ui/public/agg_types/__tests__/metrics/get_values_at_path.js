import getValuesAtPath from 'ui/agg_types/metrics/_get_values_at_path';
import expect from 'expect.js';

describe('getValuesAtPath', function () {
  it('non existing path', function () {
    const values = getValuesAtPath({ aaa: 'bbb' }, [ 'not', 'in', 'there' ]);
    expect(values).to.have.length(0);
  });

  it('non existing path in nested object', function () {
    const json = {
      aaa: {
        bbb: 123
      }
    };
    const values = getValuesAtPath(json, [ 'aaa', 'ccc' ]);
    expect(values).to.have.length(0);
  });

  it('get value at level one', function () {
    const values = getValuesAtPath({ aaa: 'bbb' }, [ 'aaa' ]);
    expect(values).to.eql([ 'bbb' ]);
  });

  it('get nested value', function () {
    const json = {
      aaa: {
        bbb: 123
      }
    };
    const values = getValuesAtPath(json, [ 'aaa', 'bbb' ]);
    expect(values).to.eql([ 123 ]);
  });

  it('value is an array', function () {
    const json = {
      aaa: [ 123, 456 ]
    };
    const values = getValuesAtPath(json, [ 'aaa' ]);
    expect(values).to.eql([ 123, 456 ]);
  });

  it('nested value is an array', function () {
    const json = {
      aaa: {
        bbb: [ 123, 456 ]
      }
    };
    const values = getValuesAtPath(json, [ 'aaa', 'bbb' ]);
    expect(values).to.eql([ 123, 456 ]);
  });

  it('multiple values are reachable via path', function () {
    const json = {
      aaa: [
        {
          bbb: 123
        },
        {
          bbb: 456
        }
      ]
    };
    const values = getValuesAtPath(json, [ 'aaa', 'bbb' ]);
    expect(values).to.eql([ 123, 456 ]);
  });

  it('multiple values with some that are arrays are reachable via path', function () {
    const json = {
      aaa: [
        {
          bbb: [ 123, 456 ]
        },
        {
          bbb: 789
        }
      ]
    };
    const values = getValuesAtPath(json, [ 'aaa', 'bbb' ]);
    expect(values).to.eql([ 123, 456, 789 ]);
  });

  it('nested array mix', function () {
    const json = {
      aaa: [
        {
          bbb: [
            {
              ccc: 123
            },
            {
              ccc: 456
            }
          ]
        },
        {
          bbb: {
            ccc: 789
          }
        }
      ]
    };
    const values = getValuesAtPath(json, [ 'aaa', 'bbb', 'ccc' ]);
    expect(values).to.eql([ 123, 456, 789 ]);
  });

  describe('nulls', function () {
    it('on level 1', function () {
      const json = {
        aaa: null
      };
      expect(getValuesAtPath(json, [ 'aaa' ])).to.have.length(0);
      expect(getValuesAtPath(json, [ 'aaa', 'bbb' ])).to.have.length(0);
    });

    it('on level 2', function () {
      const json = {
        aaa: {
          bbb: null
        }
      };
      expect(getValuesAtPath(json, [ 'aaa', 'bbb' ])).to.have.length(0);
      expect(getValuesAtPath(json, [ 'aaa', 'bbb', 'ccc' ])).to.have.length(0);
    });

    it('in array', function () {
      const json = {
        aaa: [
          123,
          null
        ]
      };
      expect(getValuesAtPath(json, [ 'aaa' ])).to.eql([ 123 ]);
    });

    it('nested in array', function () {
      const json = {
        aaa: [
          {
            bbb: 123
          },
          {
            bbb: null
          }
        ]
      };
      expect(getValuesAtPath(json, [ 'aaa', 'bbb' ])).to.eql([ 123 ]);
    });
  });
});

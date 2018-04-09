import { seededDocs, buildTransformFunction } from './documents';

describe('buildTransformFunction', () => {
  test('always returns a raw document', () => {
    const migrations = [{
      filter: ({ name }) => name === 'dabbo',
      transform: ({ name }) => ({ name, age: 'old' }),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn({
      _id: 'bar',
      _source: { name: 'dabbo' },
    })).toEqual({
      _id: 'bar',
      _source: { name: 'dabbo', age: 'old' },
    });
  });

  test('passes raw document as second arg', () => {
    const migrations = [{
      filter: (source, { _id }) => _id === 'bar',
      transform: (source, { _source }) => ({
        _source,
        _id: 'changeditonyou',
      }),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn({
      _id: 'bar',
      _source: { name: 'dabbo' },
    })).toEqual({
      _id: 'changeditonyou',
      _source: { name: 'dabbo' },
    });
  });

  test('can be passed source', () => {
    const doc = { dunnoes: 'nothin' };
    const migrations = [{
      filter: () => true,
      transform: (source) => ({
        ...source,
        also: 'this',
      }),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn(doc))
      .toEqual({
        _id: undefined,
        _source: {
          dunnoes: 'nothin',
          also: 'this',
        },
      });
  });

  test('only applies when filter evaluates to true', () => {
    const docA = {
      _id: 'dont',
      _source: {
        type: 'panic',
        attributes: {
          thanks: 'for all the fish',
        },
      }
    };
    const docB = {
      _id: 'dont',
      _source: {
        type: 'shniky',
        attributes: {
          thanks: 'for all the fish',
        },
      }
    };
    const migrations = [{
      filter: ({ type }) => type === 'panic',
      transform: (doc) => ({
        ...doc,
        here: true,
      }),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn(docA)._source.here).toBeTruthy();
    expect(fn(docB)).toEqual(docB);
  });

  test('only applies transform migrations', () => {
    const doc = {
      _id: 'dont',
      _source: {
        type: 'panic',
        attributes: {
          thanks: 'for all the fish',
        },
      },
    };
    const migrations = [{
      filter: ({ type }) => type === 'panic',
      transform: (doc) => ({
        ...doc,
        here: true,
      }),
    }, {
      seed: () => { throw new Error('DOH!'); }
    }, {
      filter: () => true,
      transform: (doc) => ({
        ...doc,
        hereToo: true,
      }),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn(doc))
      .toEqual({
        _id: 'dont',
        _source: {
          type: 'panic',
          here: true,
          hereToo: true,
          attributes: {
            thanks: 'for all the fish',
          },
        },
      });
  });
});

describe('seededDocs', () => {
  test('returns the seeds', () => {
    const migrations = [{
      seed: () => ({
        _id: 'hey',
        _source: {
          type: 'you',
          attributes: {
            guys: 'check it out',
          },
        },
      }),
    }, {
      seed: () => ({
        _id: 1112,
        _source: {
          goob: 'pea',
        },
      }),
    }];
    expect(seededDocs(migrations))
      .toEqual([{
        _id: 'hey',
        _source: {
          type: 'you',
          attributes: {
            guys: 'check it out',
          },
        }
      }, {
        _id: 1112,
        _source: {
          goob: 'pea',
        },
      }]);
  });

  test('runs seeds through subsequent transforms', () => {
    const migrations = [{
      filter: () => true,
      transform: () => { throw new Error('NOPE'); },
    }, {
      seed: () => ({
        _id: 'hey',
        _source: {
          type: 'you',
          attributes: {
            guys: 'check it out',
          },
        },
      }),
    }, {
      filter: () => true,
      transform: (doc, { _source }) => ({
        _source,
        _id: 'yoyo',
      }),
    }, {
      seed: () => ({
        _id: 1112,
        _source: {
          goob: 'pea',
        },
      }),
    }, {
      filter: ({ type }) => type === 'you',
      transform: (doc) => ({
        ...doc,
        attributes: {
          ...doc.attributes,
          lastTransform: true,
        },
      }),
    }, {
      filter: ({ goob }) => goob === 'pea',
      transform: (doc, { _source }) => ({
        _source,
        _id: 'shazm',
      }),
    }];
    expect(seededDocs(migrations))
      .toEqual([{
        _id: 'yoyo',
        _source: {
          type: 'you',
          attributes: {
            guys: 'check it out',
            lastTransform: true,
          },
        },
      }, {
        _id: 'shazm',
        _source: {
          goob: 'pea',
        },
      }]);
  });
});

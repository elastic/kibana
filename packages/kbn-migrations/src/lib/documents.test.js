const _ = require('lodash');
const { seededDocs, buildTransformFunction, rawToClient, clientToRaw } = require('./documents');

// Test if id is not specified by seed, it will be generated
// Test that seeds blow up, maybe, if type isn't specified, etc?

describe('buildTransformFunction', () => {
  test('always returns a raw document', () => {
    const migrations = [{
      filter: ({ type }) => type === 'dabo',
      transform: (doc) => _.set(doc, 'attributes.name', 'swinney'),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn({
      _id: 'dabo:coach',
      _source: { type: 'dabo', dabo: { name: 'tigers' } },
    })).toEqual({
      _id: 'dabo:coach',
      _source: { type: 'dabo', dabo: { name: 'swinney' } },
    });
  });

  test('runs multiple transforms', () => {
    const migrations = [{
      filter: ({ type }) => type === 'bar',
      transform: (doc) => _.set(doc, 'attributes.baz', 'Nifties'),
    }, {
      filter: ({ type }) => type === 'bar',
      transform: (doc) => _.set(doc, 'attributes.bing', 'Bingiton'),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn({
      _id: 'bar:123',
      _source: { type: 'bar', bar: { baz: 'shazm' } },
    })).toEqual({
      _id: 'bar:123',
      _source: { type: 'bar', bar: { baz: 'Nifties', bing: 'Bingiton' } },
    });
  });

  test('only applies when filter evaluates to true', () => {
    const docA = {
      _id: 'dont:panic',
      _source: {
        type: 'dont',
        dont: {
          thanks: 'for all the fish',
        },
      },
    };
    const docB = {
      _id: 'do:panic',
      _source: {
        type: 'do',
        do: {
          thanks: 'and bring a towel',
        },
      },
    };
    const migrations = [{
      filter: ({ type }) => type === 'do',
      transform: (doc) => _.set(doc, 'attributes.towel', 'massively useful'),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn(_.cloneDeep(docA))).toEqual(docA);
    expect(fn(_.cloneDeep(docB))).not.toEqual(docB);
    expect(fn(_.cloneDeep(docB))._source.do.towel).toEqual('massively useful');
  });

  test('only applies transform migrations', () => {
    const doc = {
      _id: 'here:iam',
      _source: {
        type: 'here',
        here: {
          there: 'You are',
        },
      },
    };
    const migrations = [{
      filter: ({ type }) => type === 'here',
      transform: (doc) => _.set(doc, 'attributes.a', true),
    }, {
      seed: () => { throw new Error('DOH!'); }
    }, {
      filter: () => true,
      transform: (doc) => _.set(doc, 'attributes.b', true),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn(doc))
      .toEqual({
        _id: 'here:iam',
        _source: {
          type: 'here',
          here: {
            there: 'You are',
            a: true,
            b: true,
          },
        },
      });
  });

  test('passes non-object-client docs straight through', () => {
    const doc = {
      _id: 'dadams',
      _source: {
        says: 'You live and learn. At any rate, you live.'
      },
    };
    const migrations = [{
      filter: () => true,
      transform: () => { throw new Error(`Shouldn't get called, since there are no object-client docs being migrated`); },
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn(_.cloneDeep(doc)))
      .toEqual(doc);
  });
});

describe('seededDocs', () => {
  test('returns the seeds', () => {
    const migrations = [{
      seed: () => ({
        id: 'onceandfutureking',
        type: 'book',
        attributes: {
          quote: 'Everything not forbidden is compulsory',
        },
      }),
    }, {
      seed: () => ({
        id: 'ireland',
        type: 'island',
        attributes: {
          color: 'emerald',
        },
      }),
    }];
    expect(seededDocs(migrations))
      .toEqual([{
        _id: 'book:onceandfutureking',
        _source: {
          type: 'book',
          book: {
            quote: 'Everything not forbidden is compulsory',
          },
        }
      }, {
        _id: 'island:ireland',
        _source: {
          type: 'island',
          island: {
            color: 'emerald',
          },
        },
      }]);
  });

  test('generates id if not provided', () => {
    const migrations = [{
      seed: () => ({
        type: 'animal',
        attributes: {
          name: 'Sir Scrambles',
        },
      }),
    }];
    expect(seededDocs(migrations)[0]._id)
      .not.toEqual(seededDocs(migrations)[0]._id);
    expect(seededDocs(migrations)[0]._id)
      .toMatch(/[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}$/);
  });

  test('runs seeds through subsequent transforms', () => {
    const migrations = [{
      filter: () => true,
      transform: () => { throw new Error('NOPE'); },
    }, {
      seed: () => ({
        id: '1984',
        type: 'novel',
        attributes: {
          text: 'Perhaps a lunatic was simply a minority of one.'
        },
      }),
    }, {
      filter: ({ type }) => type === 'novel',
      transform: (doc) => _.set(doc, 'attributes.rating', 5),
    }, {
      seed: () => ({
        id: 'twotowers',
        type: 'novel',
        attributes: {
          text: 'Fair speech may hide a foul heart.'
        },
      }),
    }, {
      filter: ({ type }) => type === 'novel',
      transform: (doc) => _.set(doc, 'attributes.author', 'N/A'),
    }];
    expect(seededDocs(_.cloneDeep(migrations)))
      .toEqual([{
        _id: 'novel:1984',
        _source: {
          type: 'novel',
          novel: {
            text: 'Perhaps a lunatic was simply a minority of one.',
            rating: 5,
            author: 'N/A',
          },
        },
      }, {
        _id: 'novel:twotowers',
        _source: {
          type: 'novel',
          novel: {
            text: 'Fair speech may hide a foul heart.',
            author: 'N/A',
          },
        },
      }]);
  });
});

describe('rawToClient', () => {
  test('it transforms raw docs to the save object client format', () => {
    const rawDoc = {
      _id: 'foo:32342',
      _source: {
        type: 'foo',
        updated_at: 'yesterday',
        foo: { bar: 'baz' },
      },
    };
    expect(rawToClient(rawDoc))
      .toEqual({
        id: '32342',
        type: 'foo',
        updated_at: 'yesterday',
        attributes: { bar: 'baz' },
      });
  });
});

describe('clientToRaw', () => {
  test('it transforms client object format to raw', () => {
    const clientDoc = {
      id: '32342',
      type: 'foo',
      updated_at: 'yesterday',
      attributes: { bar: 'baz' },
    };
    expect(clientToRaw(clientDoc))
      .toEqual({
        _id: 'foo:32342',
        _source: {
          type: 'foo',
          updated_at: 'yesterday',
          foo: { bar: 'baz' },
        },
      });
  });
});

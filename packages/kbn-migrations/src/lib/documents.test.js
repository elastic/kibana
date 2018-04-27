const _ = require('lodash');
const { seededDocs, buildTransformFunction, toObjectClient, toRaw } = require('./documents');

// Test if id is not specified by seed, it will be generated
// Test that seeds blow up, maybe, if type isn't specified, etc?

describe('buildTransformFunction', () => {
  test('accepts a raw document (e.g. straight from the index)', () => {
    const migrations = [{
      filter: ({ type }) => type === 'dabo',
      transform: (doc) => _.set(doc, 'attributes.name', 'swinney'),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn({
      _id: 'dabo:coach',
      _source: { type: 'dabo', dabo: { name: 'tigers' } },
    })).toEqual({
      id: 'coach',
      type: 'dabo',
      attributes: { name: 'swinney' },
    });
  });

  test('accepts an object client document', () => {
    const migrations = [{
      filter: ({ type }) => type === 'coach',
      transform: (doc) => _.set(doc, 'attributes.name', 'swinney'),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn({
      id: 'dabo',
      type: 'coach',
      attributes: { name: 'tigers' },
    })).toEqual({
      id: 'dabo',
      type: 'coach',
      attributes: { name: 'swinney' },
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
      id: '123',
      type: 'bar',
      attributes: { baz: 'Nifties', bing: 'Bingiton' },
    });
  });

  test('only applies when filter evaluates to true', () => {
    const docA = {
      id: 'panic',
      type: 'dont',
      attributes: { thanks: 'for all the fish' },
    };
    const docB = {
      id: 'panic',
      type: 'do',
      attributes: { thanks: 'and bring a towel' },
    };
    const migrations = [{
      filter: ({ type }) => type === 'do',
      transform: (doc) => _.set(doc, 'attributes.towel', 'massively useful'),
    }];
    const fn = buildTransformFunction(migrations);
    expect(fn(_.cloneDeep(docA))).toEqual(docA);
    expect(fn(_.cloneDeep(docB))).not.toEqual(docB);
    expect(fn(_.cloneDeep(docB)).attributes.towel).toEqual('massively useful');
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
        id: 'iam',
        type: 'here',
        attributes: {
          there: 'You are',
          a: true,
          b: true,
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
        id: 'onceandfutureking',
        type: 'book',
        attributes: { quote: 'Everything not forbidden is compulsory' },
      }, {
        id: 'ireland',
        type: 'island',
        attributes: { color: 'emerald' },
      }]);
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
        id: '1984',
        type: 'novel',
        attributes: {
          text: 'Perhaps a lunatic was simply a minority of one.',
          rating: 5,
          author: 'N/A',
        },
      }, {
        id: 'twotowers',
        type: 'novel',
        attributes: {
          text: 'Fair speech may hide a foul heart.',
          author: 'N/A',
        },
      }]);
  });
});

describe('toObjectClient', () => {
  test('it transforms raw docs to the save object client format', () => {
    const rawDoc = {
      _id: 'foo:32342',
      _source: {
        type: 'foo',
        updated_at: 'yesterday',
        foo: { bar: 'baz' },
      },
    };
    expect(toObjectClient(rawDoc))
      .toEqual({
        id: '32342',
        type: 'foo',
        updated_at: 'yesterday',
        attributes: { bar: 'baz' },
      });
  });
});

describe('toRaw', () => {
  test('it generates an id if none is provided', () => {
    const clientDoc = {
      type: 'foo',
      updated_at: 'yesterday',
      attributes: { },
    };

    expect(toRaw(clientDoc)._id)
      .not.toEqual(toRaw(clientDoc)._id);
    expect(toRaw(clientDoc)._id)
      .toMatch(/[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}$/);
  });

  test('it transforms client object format to raw', () => {
    const clientDoc = {
      id: '32342',
      type: 'foo',
      updated_at: 'yesterday',
      attributes: { bar: 'baz' },
    };
    expect(toRaw(clientDoc))
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

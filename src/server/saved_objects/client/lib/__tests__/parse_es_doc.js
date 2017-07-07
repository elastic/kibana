import expect from 'expect.js';
import { parseEsDoc } from '../parse_es_doc';

describe('parseEsDoc', () => {
  it('handle legacy doc types', () => {
    const doc = {
      _id: 'foo',
      _type: 'test',
      _version: 2,
      _source: { title: 'test' }
    };

    expect(parseEsDoc(doc)).to.eql({
      id: 'foo',
      type: 'test',
      version: 2,
      attributes: { title: 'test' }
    });
  });

  it('handle migrated single doc type', () => {
    const doc = {
      _id: 'test:foo',
      _type: 'doc',
      _version: 2,
      _source: { type: 'test', test: { title: 'test' } }
    };

    expect(parseEsDoc(doc)).to.eql({
      id: 'foo',
      type: 'test',
      version: 2,
      attributes: { title: 'test' }
    });
  });

  it('handles an overwritten type', () => {
    const doc = {
      _type: 'doc',
      _id: 'test:foo',
      _version: 2,
      _source: { type: 'test', test: { title: 'test' } }
    };
    const overrides = { type: 'test' };

    expect(parseEsDoc(doc, overrides)).to.eql({
      id: 'foo',
      type: 'test',
      version: 2,
      attributes: { title: 'test' }
    });
  });

  it('can add additional keys', () => {
    const doc = {
      _type: 'doc',
      _id: 'test:foo',
      _version: 2,
      _source: { type: 'test', test: { title: 'test' } }
    };
    const overrides = { error: 'An error!' };

    expect(parseEsDoc(doc, overrides)).to.eql({
      id: 'foo',
      type: 'test',
      version: 2,
      attributes: { title: 'test' },
      error: 'An error!'
    });
  });

  it('handles already prefixed ids with the type', () => {
    const doc = {
      _type: 'doc',
      _id: 'test:test:foo',
      _version: 2,
      _source: { type: 'test', test: { title: 'test' } }
    };
    const overrides = { error: 'An error!' };

    expect(parseEsDoc(doc, overrides)).to.eql({
      id: 'test:foo',
      type: 'test',
      version: 2,
      attributes: { title: 'test' },
      error: 'An error!'
    });
  });
});

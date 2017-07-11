import expect from 'expect.js';
import { v5BulkCreate, v6BulkCreate } from '../compatibility';

describe('compatibility', () => {
  const testObjects = [
    { type: 'index-pattern', id: 'one', attributes: { title: 'Test Index Pattern' } },
    { type: 'config', id: 'two', attributes: { title: 'Test Config Value' }  }
  ];

  describe('v5BulkCreate', () => {
    it('handles default options', () => {
      const objects = v5BulkCreate(testObjects);
      expect(objects).to.eql([
        { create: { _type: 'index-pattern', _id: 'one' } },
        { title: 'Test Index Pattern' },
        { create: { _type: 'config', _id: 'two' } },
        { title: 'Test Config Value' }
      ]);
    });

    it('uses index action for options.overwrite=true', () => {
      const objects = v5BulkCreate(testObjects, { overwrite: true });
      expect(objects).to.eql([
        { index: { _type: 'index-pattern', _id: 'one' } },
        { title: 'Test Index Pattern' },
        { index: { _type: 'config', _id: 'two' } },
        { title: 'Test Config Value' }
      ]);
    });
  });

  describe('v6BulkCreate', () => {
    it('handles default options', () => {
      const objects = v6BulkCreate(testObjects);
      expect(objects).to.eql([
        { create: { _type: 'doc', _id: 'index-pattern:one' } },
        { type: 'index-pattern', 'index-pattern': { title: 'Test Index Pattern' } },
        { create: { _type: 'doc', _id: 'config:two' } },
        { type: 'config', config: { title: 'Test Config Value' } }
      ]);
    });

    it('uses index action for options.overwrite=true', () => {
      const objects = v6BulkCreate(testObjects, { overwrite: true });
      expect(objects).to.eql([
        { index: { _type: 'doc', _id: 'index-pattern:one' } },
        { type: 'index-pattern', 'index-pattern': { title: 'Test Index Pattern' } },
        { index: { _type: 'doc', _id: 'config:two' } },
        { type: 'config', config: { title: 'Test Config Value' } }
      ]);
    });
  });
});

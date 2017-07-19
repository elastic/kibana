import expect from 'expect.js';
import { uniq } from 'lodash';
import sinon from 'sinon';

import { createStats } from '../';

import {
  createToolingLog,
  createConcatStream,
  createPromiseFromStreams
} from '../../../utils';

function drain(log) {
  log.end();
  return createPromiseFromStreams([
    log,
    createConcatStream('')
  ]);
}

function assertDeepClones(a, b) {
  const path = [];
  try {
    (function recurse(one, two) {
      if (typeof one !== 'object' || typeof two !== 'object') {
        expect(one).to.be(two);
        return;
      }

      expect(one).to.eql(two);
      expect(one).to.not.be(two);
      const keys = uniq(Object.keys(one).concat(Object.keys(two)));
      keys.forEach(k => {
        path.push(k);
        recurse(one[k], two[k]);
        path.pop();
      });
    }(a, b));
  } catch (err) {
    throw new Error(
      `Expected a and b to be deep clones of each other, error at:\n\n` +
      `  "${path.join('.') || '-'}"\n\n` +
      err.stack
    );
  }
}

describe('esArchiver: Stats', () => {
  describe('#skippedIndex(index)', () => {
    it('marks the index as skipped', () => {
      const stats = createStats('name', createToolingLog());
      stats.skippedIndex('index-name');
      const indexStats = stats.toJSON()['index-name'];
      expect(indexStats).to.have.property('skipped', true);
    });

    it('logs that the index was skipped', async () => {
      const log = createToolingLog('debug');
      const stats = createStats('name', log);
      stats.skippedIndex('index-name');
      expect(await drain(log)).to.contain('Skipped');
    });
  });

  describe('#deletedIndex(index)', () => {
    it('marks the index as deleted', () => {
      const stats = createStats('name', createToolingLog());
      stats.deletedIndex('index-name');
      const indexStats = stats.toJSON()['index-name'];
      expect(indexStats).to.have.property('deleted', true);
    });
    it('logs that the index was deleted', async () => {
      const log = createToolingLog('debug');
      const stats = createStats('name', log);
      stats.deletedIndex('index-name');
      expect(await drain(log)).to.contain('Deleted');
    });
  });

  describe('#createdIndex(index, [metadata])', () => {
    it('marks the index as created', () => {
      const stats = createStats('name', createToolingLog());
      stats.createdIndex('index-name');
      const indexStats = stats.toJSON()['index-name'];
      expect(indexStats).to.have.property('created', true);
    });
    it('logs that the index was created', async () => {
      const log = createToolingLog('debug');
      const stats = createStats('name', log);
      stats.createdIndex('index-name');
      expect(await drain(log)).to.contain('Created');
    });
    describe('with metadata', () => {
      it('debug-logs each key from the metadata', async () => {
        const log = createToolingLog('debug');
        const stats = createStats('name', log);
        stats.createdIndex('index-name', {
          foo: 'bar'
        });
        const output = await drain(log);
        expect(output).to.contain('debg');
        expect(output).to.contain('foo "bar"');
      });
    });
    describe('without metadata', () => {
      it('no debug logging', async () => {
        const log = createToolingLog('debug');
        const stats = createStats('name', log);
        stats.createdIndex('index-name');
        const output = await drain(log);
        expect(output).to.not.contain('debg');
      });
    });
  });

  describe('#archivedIndex(index, [metadata])', () => {
    it('marks the index as archived', () => {
      const stats = createStats('name', createToolingLog());
      stats.archivedIndex('index-name');
      const indexStats = stats.toJSON()['index-name'];
      expect(indexStats).to.have.property('archived', true);
    });
    it('logs that the index was archived', async () => {
      const log = createToolingLog('debug');
      const stats = createStats('name', log);
      stats.archivedIndex('index-name');
      expect(await drain(log)).to.contain('Archived');
    });
    describe('with metadata', () => {
      it('debug-logs each key from the metadata', async () => {
        const log = createToolingLog('debug');
        const stats = createStats('name', log);
        stats.archivedIndex('index-name', {
          foo: 'bar'
        });
        const output = await drain(log);
        expect(output).to.contain('debg');
        expect(output).to.contain('foo "bar"');
      });
    });
    describe('without metadata', () => {
      it('no debug logging', async () => {
        const log = createToolingLog('debug');
        const stats = createStats('name', log);
        stats.archivedIndex('index-name');
        const output = await drain(log);
        expect(output).to.not.contain('debg');
      });
    });
  });

  describe('#indexedDoc(index)', () => {
    it('increases the docs.indexed count for the index', () => {
      const stats = createStats('name', createToolingLog());
      stats.indexedDoc('index-name');
      expect(stats.toJSON()['index-name'].docs.indexed).to.be(1);
      stats.indexedDoc('index-name');
      stats.indexedDoc('index-name');
      expect(stats.toJSON()['index-name'].docs.indexed).to.be(3);
    });
  });

  describe('#archivedDoc(index)', () => {
    it('increases the docs.archived count for the index', () => {
      const stats = createStats('name', createToolingLog());
      stats.archivedDoc('index-name');
      expect(stats.toJSON()['index-name'].docs.archived).to.be(1);
      stats.archivedDoc('index-name');
      stats.archivedDoc('index-name');
      expect(stats.toJSON()['index-name'].docs.archived).to.be(3);
    });
  });

  describe('#toJSON()', () => {
    it('returns the stats for all indexes', () => {
      const stats = createStats('name', createToolingLog());
      stats.archivedIndex('index1');
      stats.archivedIndex('index2');
      expect(Object.keys(stats.toJSON())).to.eql(['index1', 'index2']);
    });
    it('returns a deep clone of the stats', () => {
      const stats = createStats('name', createToolingLog());
      stats.archivedIndex('index1');
      stats.archivedIndex('index2');
      stats.deletedIndex('index3');
      stats.createdIndex('index3');
      assertDeepClones(stats.toJSON(), stats.toJSON());
    });
  });

  describe('#forEachIndex(fn)', () => {
    it('iterates a clone of the index stats', () => {
      const stats = createStats('name', createToolingLog());
      stats.archivedIndex('index1');
      stats.archivedIndex('index2');
      stats.deletedIndex('index3');
      stats.createdIndex('index3');
      const stub1 = sinon.stub();
      stats.forEachIndex(stub1);
      const stub2 = sinon.stub();
      stats.forEachIndex(stub2);
      sinon.assert.callCount(stub1, 3);
      sinon.assert.callCount(stub2, 3);

      for (let i = 0; i < 3; i++) {
        assertDeepClones(stub1.args[i][0], stub2.args[i][0]);
        assertDeepClones(stub1.args[i][1], stub2.args[i][1]);
      }
    });
  });
});

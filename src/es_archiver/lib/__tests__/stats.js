describe('esArchiver: Stats', () => {
  describe('#skippedIndex(index)', () => {
    it('marks the index as skipped');
    it('logs that the index was skipped');
  });

  describe('#deletedIndex(index)', () => {
    it('marks the index as deleted');
    it('logs that the index was deleted');
  });

  describe('#createdIndex(index, [metadata])', () => {
    it('marks the index as created');
    it('logs that the index was created');
    context('with metadata', () => {
      it('debug-logs each key from the metadata');
    });
    context('without metadata', () => {
      it('no debug logging');
    });
  });

  describe('#archivedIndex(index, [metadata])', () => {
    it('marks the index as archived');
    it('logs that the index was archived');
    context('with metadata', () => {
      it('debug-logs each key from the metadata');
    });
    context('without metadata', () => {
      it('no debug logging');
    });
  });

  describe('#indexedDoc(index)', () => {
    it('increases the docs.indexed count for the index');
  });

  describe('#archivedDoc(index)', () => {
    it('increases the docs.archived count for the index');
  });

  describe('#toJSON()', () => {
    it('returns the stats for all indexes');
    it('returns a deep clone of the stats');
  });

  describe('#forEachIndex(fn)', () => {
    it('iterates a clone of the index stats');
  });
});

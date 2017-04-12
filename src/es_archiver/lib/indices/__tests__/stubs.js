import sinon from 'sinon';

export const createStubStats = () => ({
  createdIndex: sinon.stub(),
  deletedIndex: sinon.stub(),
  skippedIndex: sinon.stub(),
  archivedIndex: sinon.stub(),
  getTestSummary() {
    const summary = {};
    Object.keys(this).forEach(key => {
      if (this[key].callCount) {
        summary[key] = this[key].callCount;
      }
    });
    return summary;
  },
});

export const createStubIndexRecord = (index) => ({
  type: 'index',
  value: { index }
});

export const createStubDocRecord = (index, id) => ({
  type: 'doc',
  value: { index, id }
});

const createEsClientError = (errorType) => {
  const err = new Error(`ES Client Error Stub "${errorType}"`);
  err.body = {
    error: {
      type: errorType
    }
  };
  return err;
};

export const createStubClient = (existingIndices = []) => ({
  indices: {
    get: sinon.spy(async ({ index }) => {
      if (!existingIndices.includes(index)) {
        throw createEsClientError('index_not_found_exception');
      }

      return {
        [index]: {
          mappings: {},
          settings: {},
        }
      };
    }),
    create: sinon.spy(async ({ index }) => {
      if (existingIndices.includes(index)) {
        throw createEsClientError('index_already_exists_exception');
      } else {
        existingIndices.push(index);
        return { ok: true };
      }
    }),
    delete: sinon.spy(async ({ index }) => {
      if (existingIndices.includes(index)) {
        existingIndices.splice(existingIndices.indexOf(index), 1);
        return { ok: true };
      } else {
        throw createEsClientError('index_not_found_exception');
      }
    }),
    exists: sinon.spy(async () => {
      throw new Error('Do not use indices.exists(). React to errors instead.');
    })
  }
});

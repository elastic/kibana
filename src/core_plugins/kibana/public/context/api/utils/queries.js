function createAnchorQuery(uid, contextSort) {
  return {
    _source: true,
    query: {
      terms: {
        _uid: [uid],
      },
    },
    sort: [ contextSort, { _uid: 'asc' } ],
  };
}

function createSuccessorsQuery(anchorSortValues, contextSort, size) {
  return {
    _source: true,
    query: {
      match_all: {},
    },
    size,
    sort: [ contextSort, { _uid: 'asc' } ],
    search_after: anchorSortValues,
  };
}


export {
  createAnchorQuery,
  createSuccessorsQuery,
};

function createAnchorQuery(uid, contextSort) {
  return {
    _source: true,
    query: {
      terms: {
        _uid: [uid],
      },
    },
    sort: [contextSort],
  };
}

function createSuccessorsQuery(anchorUid, anchorSortValues, contextSort, size) {
  return {
    _source: true,
    query: {
      match_all: {},
    },
    size,
    sort: [ contextSort, { _uid: 'asc' } ],
    search_after: anchorSortValues.concat([ anchorUid ]),
  };
}


export {
  createAnchorQuery,
  createSuccessorsQuery,
};

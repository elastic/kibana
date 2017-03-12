function createAnchorQueryBody(uid, contextSort) {
  return {
    _source: true,
    version: true,
    query: {
      terms: {
        _uid: [uid],
      },
    },
    sort: [ contextSort, { _uid: 'asc' } ],
  };
}

function createSuccessorsQueryBody(anchorSortValues, contextSort, size) {
  return {
    _source: true,
    version: true,
    query: {
      match_all: {},
    },
    size,
    sort: [ contextSort, { _uid: 'asc' } ],
    search_after: anchorSortValues,
  };
}


export {
  createAnchorQueryBody,
  createSuccessorsQueryBody,
};

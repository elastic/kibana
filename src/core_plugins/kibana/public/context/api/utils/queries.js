function createAnchorQueryBody(uid, contextSort) {
  return {
    _source: true,
    version: true,
    query: {
      terms: {
        _uid: [uid],
      },
    },
    sort: contextSort,
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
    sort: contextSort,
    search_after: anchorSortValues,
  };
}


export {
  createAnchorQueryBody,
  createSuccessorsQueryBody,
};

define(function (require) {
  return function savedSearchObjectFn(Private, savedSearches) {
    return {
      service: savedSearches,
      name: 'searches',
      noun: 'Saved Search',
      nouns: 'saved searches'
    };
  };
});

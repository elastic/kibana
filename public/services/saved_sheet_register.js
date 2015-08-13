define(function (require) {
  return function savedSearchObjectFn(Private, savedSheets) {
    return {
      service: savedSheets,
      name: 'timelion-sheet',
      noun: 'Saved Sheets',
      nouns: 'saved sheets'
    };
  };
});

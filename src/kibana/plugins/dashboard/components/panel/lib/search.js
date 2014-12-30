define(function (require) {
  return function searchLoader(savedSearches, Private) { // Inject services here
    return function (panel, $scope) { // Function parameters here
      return savedSearches.get(panel.id)
        .then(function (savedSearch) {
          return {
            savedObj: savedSearch,
            panel: panel,
            edit: '#discover'
          };
        });
    };
  };
});

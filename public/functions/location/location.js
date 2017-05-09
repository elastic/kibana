const Fn = require('../../../common/functions/fn.js');

module.exports = new Fn({
  name: 'location',
  type: 'geoposition',
  help: 'Get the users location',
  fn: () => {
    return new Promise((resolve) => {
      function createLocation(geoposition) {
        resolve({ type: 'geoposition', coords: geoposition.coords });
      }
      navigator.geolocation.getCurrentPosition(createLocation);
    });
  },
});

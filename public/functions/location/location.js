const Fn = require('../../../common/functions/fn.js');

module.exports = new Fn({
  name: 'location',
  type: 'string',
  help: 'Get the users location',
  fn: () => {
    return new Promise((resolve) => {
      function createLocation(geoposition) {
        const { latitude, longitude } = geoposition.coords;
        return resolve(`${latitude}, ${longitude}`);
      }
      return navigator.geolocation.getCurrentPosition(createLocation);
    });
  },
});

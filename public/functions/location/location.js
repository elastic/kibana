import Fn from '../../../common/functions/fn.js';

export default new Fn({
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

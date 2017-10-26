import { noop } from 'lodash';

export const location = {
  name: 'location',
  type: 'location',
  context: {
    types: ['null'],
  },
  help: 'Use the browser\'s location functionality to get your current location. Usually quite slow, but fairly accurate',
  fn: () => {
    return new Promise((resolve) => {
      function createLocation(geoposition) {
        const { latitude, longitude } = geoposition.coords;
        return resolve(
          {
            type: 'location',
            longitude,
            latitude,
          }
        );
      }
      return navigator.geolocation.getCurrentPosition(createLocation, noop, {
        maximumAge: 5000,
      });
    });
  },
};

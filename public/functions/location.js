const noop = () => {};

export const location = () => ({
  name: 'location',
  type: 'datatable',
  context: {
    types: ['null'],
  },
  help:
    "Use the browser's location functionality to get your current location. Usually quite slow, but fairly accurate",
  fn: () => {
    return new Promise(resolve => {
      function createLocation(geoposition) {
        const { latitude, longitude } = geoposition.coords;
        return resolve({
          type: 'datatable',
          columns: [{ name: 'latitude', type: 'number' }, { name: 'longitude', type: 'number' }],
          rows: [{ latitude, longitude }],
        });
      }
      return navigator.geolocation.getCurrentPosition(createLocation, noop, {
        maximumAge: 5000,
      });
    });
  },
});

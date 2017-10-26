import fetch from 'axios';

// TODO: We should implement our own Elastic GeoIP service instead of using freegeoip.net
export const geoip = {
  name: 'geoip',
  aliases: [],
  type: 'location',
  help: 'Uses an online service to perform a lookup on your own, or another, IP',
  context: {},
  args: {
    _: {
      types: [
        'string',
      ],
      aliases: ['ip', 'host'],
      default: '""',
      help: 'An optional IP or hostname. If left blank your own IP will be used',
      multi: false,
    },
  },
  fn: (context, args) => {
    return fetch(`https://freegeoip.net/json/${args._}`, {
      method: 'GET',
    })
    .then(res => {

      return {
        type: 'location',
        latitude: res.data.latitude,
        longitude: res.data.longitude,
      };
    });
  },
};

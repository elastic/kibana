import fetch from 'axios';

// TODO: We should implement our own Elastic GeoIP service instead of using freegeoip.net
export default {
  name: 'geoip',
  aliases: [],
  type: 'location',
  help: 'Uses freegeoip.net to perform ',
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

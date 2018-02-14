export default function (api) {

  api.addEndpointDescription('_get_settings', {
    patterns: [
      "{indices}/_settings",
      "_settings"
    ],
    url_params: {
      flat_settings: "__flag__"
    }
  });
  api.addEndpointDescription('_put_settings', {
    methods: ['PUT'],
    patterns: [
      "{indices}/_settings",
      "_settings"
    ],
  });
}

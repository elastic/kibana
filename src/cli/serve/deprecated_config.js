import _, { has, noop, partial } from 'lodash';

// deprecated settings are still allowed, but will be removed at a later time. They
// are checked for after the config object is prepared and known, so legacySettings
// will have already been transformed.

function Ignored(key, message) {
  return function (object) {
    if (has(object, key)) return message;

    return null;
  };
}

const serverSslEnabled = (object) => {
  const has = partial(_.has, object);
  const set = partial(_.set, object);

  if (!has(['server', 'ssl', 'enabled']) && has(['server', 'ssl', 'certificate']) && has(['server', 'ssl', 'key'])) {
    set('server.ssl.enabled', true);
    return 'Enabling ssl by only specifying server.ssl.certificate and server.ssl.key is deprecated. Please set server.ssl.enabled to true';
  }

  return null;
};

const deprecatedSettings = [
  new Ignored(['server', 'xsrf', 'token'], 'server.xsrf.token is deprecated. It is no longer used when providing xsrf protection.'),
  serverSslEnabled
];

// check for and warn about deprecated settings
export function checkForDeprecatedConfig(object, log = noop) {
  deprecatedSettings.forEach((deprecatedSetting) => {
    const msg = deprecatedSetting(object);
    if (msg) log(msg);
  });

  return object;
}

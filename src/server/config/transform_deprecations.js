import _, { partial } from 'lodash';
import { createTransform, Deprecations } from '../../deprecation';

const { rename, unused } = Deprecations;

const serverSslEnabled = (settings, log) => {
  const has = partial(_.has, settings);
  const set = partial(_.set, settings);

  if (!has('server.ssl.enabled') && has('server.ssl.certificate') && has('server.ssl.key')) {
    set('server.ssl.enabled', true);
    log('Enabling ssl by only specifying server.ssl.certificate and server.ssl.key is deprecated. Please set server.ssl.enabled to true');
  }
};

const savedObjectsIndexCheckTimeout = (settings, log) => {
  if (_.has(settings, 'savedObjects.indexCheckTimeout')) {
    log('savedObjects.indexCheckTimeout is no longer necessary.');

    if (Object.keys(settings.savedObjects).length > 1) {
      delete settings.savedObjects.indexCheckTimeout;
    } else {
      delete settings.savedObjects;
    }
  }
};

const deprecations = [
  //server
  rename('server.ssl.cert', 'server.ssl.certificate'),
  unused('server.xsrf.token'),
  unused('uiSettings.enabled'),
  rename('optimize.lazy', 'optimize.watch'),
  rename('optimize.lazyPort', 'optimize.watchPort'),
  rename('optimize.lazyHost', 'optimize.watchHost'),
  rename('optimize.lazyPrebuild', 'optimize.watchPrebuild'),
  rename('optimize.lazyProxyTimeout', 'optimize.watchProxyTimeout'),
  serverSslEnabled,
  savedObjectsIndexCheckTimeout,
];

export const transformDeprecations = createTransform(deprecations);

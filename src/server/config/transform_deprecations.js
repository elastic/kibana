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

const rewriteBasePath = (settings, log) => {
  if (_.has(settings, 'server.basePath') && !_.has(settings, 'server.rewriteBasePath')) {
    log(
      'You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana ' +
      'will expect that all requests start with server.basePath rather than expecting you to rewrite ' +
      'the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the ' +
      'current behavior and silence this warning.'
    );
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
  rewriteBasePath,
];

export const transformDeprecations = createTransform(deprecations);

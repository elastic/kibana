import _ , { partial } from 'lodash';
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

const deprecations = [
  //server
  rename('server.ssl.cert', 'server.ssl.certificate'),
  unused('server.xsrf.token'),
  serverSslEnabled,
];

export const transformDeprecations = createTransform(deprecations);

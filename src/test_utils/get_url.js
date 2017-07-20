import _ from 'lodash';
import url from 'url';

/**
* Converts a config and a pathname to a url
* @param {object} config A url config
*   example:
*   {
*      protocol: 'http',
*      hostname: 'localhost',
*      port: 9220,
*      auth: shield.kibanaUser.username + ':' + shield.kibanaUser.password
*   }
* @param {object} app The params to append
*   example:
*   {
*      pathname: 'app/kibana',
*      hash: '/discover'
*   }
* @return {string}
*/

module.exports = getUrl;

function getUrl(config, app) {
  return url.format(_.assign({}, config, app));
}

getUrl.noAuth = function getUrlNoAuth(config, app) {
  config = _.pick(config, function (val, param) {
    return param !== 'auth';
  });
  return getUrl(config, app);
};

getUrl.baseUrl = function getBaseUrl(config) {
  return url.format(_.pick(config, 'protocol', 'hostname', 'port'));
};

import $ from 'jquery';
import { set } from 'lodash';

export default function (chrome, internals) {

  chrome.getXsrfToken = function () {
    return internals.version;
  };

  $.ajaxPrefilter(function ({ kbnXsrfToken = internals.version }, originalOptions, jqXHR) {
    if (kbnXsrfToken) {
      jqXHR.setRequestHeader('kbn-version', kbnXsrfToken);
    }
  });

  chrome.$setupXsrfRequestInterceptor = function ($httpProvider) {
    $httpProvider.interceptors.push(function () {
      return {
        request: function (opts) {
          const { kbnXsrfToken = internals.version } = opts;
          if (kbnXsrfToken) {
            set(opts, ['headers', 'kbn-version'], kbnXsrfToken);
          }
          return opts;
        }
      };
    });
  };
}

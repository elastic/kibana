import $ from 'jquery';
import { set } from 'lodash';

export default function (chrome, internals) {

  chrome.getXsrfToken = function () {
    return internals.xsrfToken;
  };

  $.ajaxPrefilter(function ({ kbnXsrfToken = internals.xsrfToken }, originalOptions, jqXHR) {
    if (kbnXsrfToken) {
      jqXHR.setRequestHeader('kbn-xsrf-token', kbnXsrfToken);
    }
  });

  chrome.$setupXsrfRequestInterceptor = function ($httpProvider) {
    $httpProvider.interceptors.push(function () {
      return {
        request: function (opts) {
          const { kbnXsrfToken = internals.xsrfToken } = opts;
          if (kbnXsrfToken) {
            set(opts, ['headers', 'kbn-xsrf-token'], kbnXsrfToken);
          }
          return opts;
        }
      };
    });
  };
}

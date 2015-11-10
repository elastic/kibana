import $ from 'jquery';
import { set } from 'lodash';

export default function (chrome, internals) {

  chrome.getXsrfToken = function () {
    return internals.xsrfToken;
  };

  $.ajaxPrefilter(function ({ kbnCsrfToken = internals.xsrfToken }, originalOptions, jqXHR) {
    if (kbnCsrfToken) {
      jqXHR.setRequestHeader('kbn-xsrf-token', kbnCsrfToken);
    }
  });

  chrome.$setupCsrfRequestInterceptor = function ($httpProvider) {
    $httpProvider.interceptors.push(function () {
      return {
        request: function (opts) {
          const { kbnCsrfToken = internals.xsrfToken } = opts;
          if (kbnCsrfToken) {
            return set(opts, ['headers', 'kbn-xsrf-token'], kbnCsrfToken);
          }
        }
      };
    });
  };
}

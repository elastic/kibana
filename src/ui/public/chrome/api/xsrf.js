import $ from 'jquery';
import { set } from 'lodash';

export default function (chrome, internals) {

  chrome.getXsrfToken = function () {
    return internals.version;
  };

  $.ajaxPrefilter(function ({ kbnXsrfToken = true }, originalOptions, jqXHR) {
    if (kbnXsrfToken) {
      jqXHR.setRequestHeader('kbn-version', internals.version);
    }
  });

  chrome.$setupXsrfRequestInterceptor = function ($httpProvider) {
    $httpProvider.interceptors.push(function () {
      return {
        request: function (opts) {
          const { kbnXsrfToken = true } = opts;
          if (kbnXsrfToken) {
            set(opts, ['headers', 'kbn-version'], internals.version);
          }
          return opts;
        }
      };
    });
  };
}

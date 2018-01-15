import { stringify as formatQueryString } from 'querystring'
import $ from 'jquery';

let esVersion = [];

export function getVersion() {
  return esVersion;
}

export function getContentType(body) {
  if (!body) return;
  return 'application/json';
}

export function send(method, path, data) {
  var wrappedDfd = $.Deferred();

  var isGetRequest = /^get$/i.test(method)
  if (data && isGetRequest) {
    method = "POST";
  }

  var options = {
    url: '../api/console/proxy?' + formatQueryString({ path, method }),
    data,
    contentType: getContentType(data),
    cache: false,
    crossDomain: true,
    type: 'POST',
    dataType: 'text', // disable automatic guessing
  };


  $.ajax(options).then(
    function (data, textStatus, jqXHR) {
      wrappedDfd.resolveWith(this, [data, textStatus, jqXHR]);
    },
    function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status == 0) {
        jqXHR.responseText = "\n\nFailed to connect to Console's backend.\nPlease check the Kibana server is up and running";
      }
      wrappedDfd.rejectWith(this, [jqXHR, textStatus, errorThrown]);
    });
  return wrappedDfd;
}

export function constructESUrl(baseUri, path) {
  baseUri = baseUri.replace(/\/+$/, '');
  path = path.replace(/^\/+/, '');
  return baseUri + '/' + path;
}

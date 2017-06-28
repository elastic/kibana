import { stringify as formatQueryString } from 'querystring'
import $ from 'jquery';

let esVersion = [];

export function getVersion() {
  return esVersion;
}

export function send(method, path, data) {
  var wrappedDfd = $.Deferred();

  console.log("Calling " + path);
  if (data && method == "GET") {
    method = "POST";
  }

  // even body-less requests will be sent with JSON as the content-type to appease Kibana
  let contentType = 'application/json';
  if (data) {
    try {
      JSON.parse(data);
    }
    catch (e) {
      try {
        data.split('\n').forEach(line => {
          if (!line) return;
          JSON.parse(line);
        });
        contentType = 'application/x-ndjson';
      } catch (e){
        // ignored (default stays the same)
      }
    }
  }

  var options = {
    url: '../api/console/proxy?' + formatQueryString({ path, method }),
    data,
    contentType,
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

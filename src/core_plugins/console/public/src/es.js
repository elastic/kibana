let _ = require('lodash');
let $ = require('jquery');

let esVersion = [];

module.exports.getVersion = function () {
  return esVersion;
};

module.exports.send = function (method, path, data) {
  var wrappedDfd = $.Deferred();

  console.log("Calling " + path);
  if (data && method == "GET") {
    method = "POST";
  }

  // delayed loading for circular references
  var settings = require("./settings");

  let contentType;
  if (data) {
    try {
      JSON.parse(data);
      contentType = 'application/json';
    }
    catch (e) {
      try {
        data.split('\n').forEach(line => {
          if (!line) return;
          JSON.parse(line);
        });
        contentType = 'application/x-ndjson';
      } catch (e){
        contentType = 'text/plain';
      }
    }
  }

  var options = {
    url: '../api/console/proxy?uri=' + encodeURIComponent(path),
    data: method == "GET" ? null : data,
    contentType,
    cache: false,
    crossDomain: true,
    type: method,
    dataType: "text", // disable automatic guessing
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
};

module.exports.constructESUrl = function (baseUri, path) {
  baseUri = baseUri.replace(/\/+$/, '');
  path = path.replace(/^\/+/, '');
  return baseUri + '/' + path;
};

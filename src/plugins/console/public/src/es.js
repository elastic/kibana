let _ = require('lodash');
let $ = require('jquery');

let baseUrl;
let serverChangeListeners = [];
let esVersion = [];

module.exports.getBaseUrl = function () {
  return baseUrl;
};
module.exports.getVersion = function () {
  return esVersion;
};

module.exports.send = function (method, path, data, server, disable_auth_alert) {
  var wrappedDfd = $.Deferred();

  server = server || exports.getBaseUrl();
  path = exports.constructESUrl(server, path);
  var uname_password_re = /^(https?:\/\/)?(?:(?:([^\/]*):)?([^\/]*?)@)?(.*)$/;
  var url_parts = path.match(uname_password_re);

  var uname = url_parts[2];
  var password = url_parts[3];
  path = url_parts[1] + url_parts[4];
  console.log("Calling " + path + "  (uname: " + uname + " pwd: " + password + ")");
  if (data && method == "GET") {
    method = "POST";
  }

  // delayed loading for circular references
  var settings = require("./settings");

  var options = {
    url: '../api/console/proxy?uri=' + encodeURIComponent(path),
    data: method == "GET" ? null : data,
    cache: false,
    crossDomain: true,
    type: method,
    password: password,
    username: uname,
    dataType: "text", // disable automatic guessing
  };


  $.ajax(options).then(
    function (data, textStatus, jqXHR) {
      wrappedDfd.resolveWith(this, [data, textStatus, jqXHR]);
    },
    function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status == 0) {
        jqXHR.responseText = "\n\nFailed to connect to Sense's backend.\nPlease check the Kibana server is up and running";
      }
      wrappedDfd.rejectWith(this, [jqXHR, textStatus, errorThrown]);
    });
  return wrappedDfd;
};

module.exports.constructESUrl = function (server, path) {
  if (!path) {
    path = server;
    server = exports.getBaseUrl();
  }
  if (path.indexOf("://") >= 0) {
    return path;
  }
  if (server.indexOf("://") < 0) {
    server = (document.location.protocol || "http:") + "//" + server;
  }
  if (server.substr(-1) == "/") {
    server = server.substr(0, server.length - 1);
  }
  if (path.charAt(0) === "/") {
    path = path.substr(1);
  }

  return server + "/" + path;
};

module.exports.forceRefresh = function () {
  exports.setBaseUrl(baseUrl, true)
};

module.exports.setBaseUrl = function (base, force) {
  if (baseUrl !== base || force) {
    var old = baseUrl;
    baseUrl = base;
    exports.send("GET", "/").done(function (data, status, xhr) {
      if (xhr.status === 200) {
        // parse for version
        var value = xhr.responseText;
        try {
          value = JSON.parse(value);
          if (value.version && value.version.number) {
            esVersion = value.version.number.split(".");
          }
        }
        catch (e) {

        }
      }
      _.each(serverChangeListeners, function (cb) {
        cb(base, old)
      });
    }).fail(function () {
      esVersion = []; // unknown
      _.each(serverChangeListeners, function (cb) {
        cb(base, old)
      });
    });
  }
};

module.exports.addServerChangeListener = function (cb) {
  serverChangeListeners.push(cb);
};

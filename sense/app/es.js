/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define([
    "_", "jquery", "exports"
  ], function (_, $, exports) {
    "use strict";

    var baseUrl;
    var serverChangeListeners = [];
    var esVersion = [];

    exports.getBaseUrl = function () {
      return baseUrl;
    };
    exports.getVersion = function () {
      return esVersion;
    };

    exports.send = function (method, path, data, server) {
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

      var options = {
        url: path,
        data: method == "GET" ? null : data,
        cache: false,
        crossDomain: true,
        type: method,
        password: password,
        username: uname,
        dataType: "text" // disable automatic guessing
      };


      // first try withCredentials for authentication during preflight checks
      // sadly it also means Access-Control-Allow-Origin: * is not valid anymore (default
      // cors setting in ES, when enabled) so we will try again without if needed.
      $.ajax(_.defaults({},
        options, {
        xhrFields: { withCredentials: true} // allow preflight credentials
      })).then(
        function (data, textStatus, jqXHR) {
          wrappedDfd.resolveWith(this, [data, textStatus, jqXHR]);
        },
        function (jqXHR, textStatus, errorThrown) {
          if (jqXHR.status == 0) {
            $.ajax(options).then(function () { // no withCredentials
              wrappedDfd.resolveWith(this, arguments);
            }, function () {
              wrappedDfd.rejectWith(this, arguments);
            });
          }
          else {
            wrappedDfd.rejectWith(this, [jqXHR, textStatus, errorThrown])
          }
        });
      return wrappedDfd;
    };

    exports.constructESUrl = function (server, path) {
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


    exports.setBaseUrl = function (base) {
      if (baseUrl !== base) {
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

    exports.addServerChangeListener = function (cb) {
      serverChangeListeners.push(cb);
    }
  }
);

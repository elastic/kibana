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

    exports.send = function (method, path, data, successCallback, completeCallback, server) {
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
        password: password,
        cache: false,
        username: uname,
        crossDomain: true,
        type: method,
        dataType: "json"
      };

      // If we provide callback then apply those to the options otherwise 
      // we assume the user will use the promise interface
      if (typeof(successCallback) === 'function') {
        options.success = successCallback;
      }
      if (typeof(completeCallback) === 'function') {
        options.complete= completeCallback;
      }

      // return the promise that other libraries can use them
      return $.ajax(options);
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
        server = "http://" + server;
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
        exports.send("GET", "/", null, null, function (xhr, status) {
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
        });
      }
    };

    exports.addServerChangeListener = function (cb) {
      serverChangeListeners.push(cb);
    }
  }
);

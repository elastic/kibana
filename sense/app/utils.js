define([
  'jquery'
], function ($) {
  'use strict';

  var utils = {};

  utils.textFromRequest = function (request) {
    var data = request.data;
    if (typeof data != "string") {
      data = data.join("\n");
    }
    return request.method + " " + request.url + "\n" + data;
  };

  utils.getUrlParam = function (name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  };

  utils.jsonToString = function(data, indent) {
    return JSON.stringify(data, null, indent ? 2 : 0);
  };

  utils.reformatData = function (data, indent) {
    var changed = false;
    var formatted_data = [];
    for (var i = 0; i < data.length; i++) {
      var cur_doc = data[i];
      try {
        var new_doc = utils.jsonToString(JSON.parse(cur_doc), indent ? 2 : 0);
        changed = changed || new_doc != cur_doc;
        formatted_data.push(new_doc);
      }
      catch (e) {
        console.log(e);
        formatted_data.push(cur_doc);
      }
    }

    return {
      changed: changed,
      data: formatted_data
    };
  };

  utils.callES = function (server, url, method, data, successCallback, completeCallback) {
    url = utils.constructESUrl(server, url);
    var uname_password_re = /^(https?:\/\/)?(?:(?:([^\/]*):)?([^\/]*?)@)?(.*)$/;
    var url_parts = url.match(uname_password_re);

    var uname = url_parts[2];
    var password = url_parts[3];
    url = url_parts[1] + url_parts[4];
    console.log("Calling " + url + "  (uname: " + uname + " pwd: " + password + ")");
    if (data && method == "GET") method = "POST";

    $.ajax({
      url: url,
      data: method == "GET" ? null : data,
      password: password,
      cache: false,
      username: uname,
      crossDomain: true,
      type: method,
      dataType: "json",
      complete: completeCallback,
      success: successCallback
    });
  };

  utils.constructESUrl = function (server, url) {
    if (url.indexOf("://") >= 0) return url;
    if (server.indexOf("://") < 0) server = "http://" + server;
    if (server.substr(-1) == "/") {
      server = server.substr(0, server.length - 1);
    }
    if (url.charAt(0) === "/") url = url.substr(1);

    return server + "/" + url;
  };

  return utils;
});
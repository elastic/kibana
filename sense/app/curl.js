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



define(function () {
  'use strict';

  function detectCURL(text) {
    // returns true if text matches a curl request
    if (!text) return false;
    return text.match(/^\s*?curl\s+(-X[A-Z]+)?\s*['"]?.*?['"]?(\s*$|\s+?-d\s*?['"])/);

  }

  function parseCURL(text) {
    var matches = text.match(/^\s*?curl\s+(?:-s\s+)?(-X\s*[A-Z]+)?\s*/);
    var ret = {
      method: "",
      server: "",
      endpoint: "",
      data: ""
    };
    if (matches[1]) {
      ret.method = matches[1].substring(2).trim(); // strip -X
    }
    text = text.substring(matches[0].length); // strip everything so far.
    if (text.length == 0) return ret;
    if (text[0] == '"') {
      matches = text.match(/^"([^"]*)"/);
    }
    else if (text[0] == "'") {
      matches = text.match(/^'([^']*)'/);
    }
    else {
      matches = text.match(/^(\S*)/);
    }

    if (!matches) return ret;
    var url = matches[1];

    if (!url.match(/:\/\//)) url = "http://" + url; // inject http as curl does

    var urlAnchor = document.createElement("a");
    urlAnchor.href = url;

    ret.server = (urlAnchor.protocol || "http") + "//" + urlAnchor.hostname;
    if (urlAnchor.port && urlAnchor.port != 0) ret.server += ":" + urlAnchor.port;
    ret.url = (urlAnchor.pathname || "") + (urlAnchor.search || "");

    text = text.substring(matches[0].length);

    // now search for -d
    matches = text.match(/.*-d\s*?'/);
    if (matches) {
      ret.data = text.substring(matches[0].length).replace(/'\s*$/, '');
    }
    else {
      matches = text.match(/.*-d\s*?"/);
      if (matches) {
        ret.data = text.substring(matches[0].length).replace(/"\s*$/, '');
        ret.data = ret.data.replace(/\\(.)/gi, "$1");
      }
    }

    if (ret.data) {
      ret.data = ret.data.trim();
    }

    return ret;
  }


  return {
    parseCURL: parseCURL, 
    detectCURL: detectCURL
  };

});

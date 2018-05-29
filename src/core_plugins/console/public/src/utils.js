/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

var utils = {};

utils.textFromRequest = function (request) {
  var data = request.data;
  if (typeof data != "string") {
    data = data.join("\n");
  }
  return request.method + " " + request.url + "\n" + data;
};

utils.jsonToString = function (data, indent) {
  return JSON.stringify(data, null, indent ? 2 : 0);
};

utils.reformatData = function (data, indent) {
  var changed = false;
  var formatted_data = [];
  for (var i = 0; i < data.length; i++) {
    var cur_doc = data[i];
    try {
      var new_doc = utils.jsonToString(JSON.parse(utils.collapseLiteralStrings(cur_doc)), indent ? 2 : 0);
      if (indent) {
        new_doc = utils.expandLiteralStrings(new_doc);
      }
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

utils.collapseLiteralStrings = function (data) {
  return data.replace(/"""(?:\s*\r?\n)?((?:.|\r?\n)*?)(?:\r?\n\s*)?"""/g, function (match, literal) {
      return JSON.stringify(literal);
  });
}

utils.expandLiteralStrings = function (data) {
  return data.replace(/("(?:\\"|[^"])*?")/g, function (match, string) {
    // expand things with two slashes or more
    if (string.split(/\\./).length > 2) {
      string = JSON.parse(string).replace("^\s*\n", "").replace("\n\s*^", "");
      var append = string.includes("\n") ? "\n" : ""; // only go multi line if the string has multiline
      return '"""' + append + string + append + '"""';
    } else {
      return string;
    }
  });
}

utils.extractDeprecationMessages = function (warnings) {
  // pattern for valid warning header
  var re = /\d{3} [0-9a-zA-Z!#$%&'*+-.^_`|~]+ \"((?:\t| |!|[\x23-\x5b]|[\x5d-\x7e]|[\x80-\xff]|\\\\|\\")*)\"(?: \"[^"]*\")/
  // split on any comma that is followed by an even number of quotes
  return _.map(utils.splitOnUnquotedCommaSpace(warnings), function (warning) {
    var match = re.exec(warning)
    // extract the actual warning if there was a match
    return "#! Deprecation: " + (match !== null ? utils.unescape(match[1]) : warning)
  });
}

utils.unescape = function (s) {
  return s.replace(/\\\\/g, "\\").replace(/\\"/g, "\"")
}

utils.splitOnUnquotedCommaSpace = function (s) {
  var quoted = false;
  var arr = [];
  var buffer = '';
  var i = 0
  while (i < s.length) {
    var token = s.charAt(i++)
    if (token == '\\' && i < s.length) {
      token += s.charAt(i++)
    } else if (token == ',' && i < s.length && s.charAt(i) == ' ') {
      token += s.charAt(i++);
    }
      if (token == '"') {
        quoted = !quoted
      } else if (!quoted && token == ', ') {
        arr.push(buffer);
        buffer = '';
        continue
      }
      buffer += token;
  }
  arr.push(buffer)
  return arr;
}

export default utils;

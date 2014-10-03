define(function (require) {
  var qs = {};

  /*****
  /*** orignally copied from angular, modified our purposes
  /*****/

  function tryDecodeURIComponent(value) {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      // Ignore any invalid uri component
    }
  }

  /**
   * This method is intended for encoding *key* or *value* parts of query component. We need a custom
   * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
   * encoded per http://tools.ietf.org/html/rfc3986:
   *    query         = *( pchar / "/" / "?" )
   *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
   *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
   *    pct-encoded   = "%" HEXDIG HEXDIG
   *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
   *                     / "*" / "+" / "," / ";" / "="
   */
  function encodeUriQuery(val, pctEncodeSpaces) {
    return encodeURIComponent(val)
      .replace(/%40/gi, '@')
      .replace(/%3A/gi, ':')
      .replace(/%24/g, '$')
      .replace(/%2C/gi, ',')
      .replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
  }

  /**
   * Parses an escaped url query string into key-value pairs.
   * @returns {Object.<string,boolean|Array>}
   */
  qs.decode = function (keyValue) {
    var obj = {}, key_value, key;
    (keyValue || '').split('&').forEach(function (keyValue) {
      if (keyValue) {
        key_value = keyValue.split('=');
        key = tryDecodeURIComponent(key_value[0]);
        if (key !== void 0) {
          var val = key_value[1] !== void 0 ? tryDecodeURIComponent(key_value[1]) : true;
          if (!obj[key]) {
            obj[key] = val;
          } else if (Array.isArray(obj[key])) {
            obj[key].push(val);
          } else {
            obj[key] = [obj[key], val];
          }
        }
      }
    });
    return obj;
  };

  /**
   * Creates a queryString out of an object
   * @param  {Object} obj
   * @return {String}
   */
  qs.encode = function (obj) {
    var parts = [];
    var keys = Object.keys(obj).sort();
    keys.forEach(function (key) {
      var value = obj[key];
      if (Array.isArray(value)) {
        value.forEach(function (arrayValue) {
          parts.push(qs.param(key, arrayValue));
        });
      } else {
        parts.push(qs.param(key, value));
      }
    });
    return parts.length ? parts.join('&') : '';
  };

  qs.param = function (key, val) {
    return encodeUriQuery(key, true) + (val === true ? '' : '=' + encodeUriQuery(val, true));
  };

  /**
   * Extracts the query string from a url
   * @param  {String} url
   * @return {Object} - returns an object describing the start/end index of the url in the string. The indices will be
   *                    the same if the url does not have a query string
   */
  qs.findInUrl = function (url) {
    var qsStart = url.indexOf('?');
    var hashStart = url.lastIndexOf('#');

    if (hashStart === -1) {
      // out of bounds
      hashStart = url.length;
    }

    if (qsStart === -1) {
      qsStart = hashStart;
    }

    return {
      start: qsStart,
      end: hashStart
    };
  };

  qs.replaceParamInUrl = function (url, param, newVal) {
    var loc = qs.findInUrl(url);
    var parsed = qs.decode(url.substring(loc.start + 1, loc.end));

    if (newVal != null) {
      parsed[param] = newVal;
    } else {
      delete parsed[param];
    }

    var chars = url.split('');
    chars.splice(loc.start, loc.end - loc.start, '?' + qs.encode(parsed));
    return chars.join('');
  };

  return qs;
});
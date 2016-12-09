var utils = {};

utils.textFromRequest = function (request, autoExpandScripts) {
  var data = request.data;
  if (typeof data != "string") {
    data = data.join("\n");
  }
  if (autoExpandScripts || typeof autoExpandScripts === "undefined" ) {
    data = utils.expandScriptsToLiterals(data);
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

utils.collapseLiteralStrings = function (data) {
  return data.replace(/"""\n?((?:.|\n)*?)"""/g,function (match, literal) {
      return JSON.stringify(literal.trim());
  });
}

utils.expandScriptsToLiterals = function (data) {
  return data.replace(/("(?:script|inline)"\s*?:)[\s\n\r]*?(".+?\\.+?[^\\]")/g, function (match, tag, string) {
    return tag + ' """\n' + JSON.parse(string).trim() + '\n"""';
  });
}

module.exports = utils;

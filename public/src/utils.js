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


module.exports = utils;

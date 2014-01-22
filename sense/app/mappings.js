define([
  'jquery',
  'utils',
  '_'
], function ($, utils, _) {
  'use strict';

  var currentServer;
  var per_index_types = {};
  var per_alias_indexes = [];

  function expandAliases(indicesOrAliases) {
    // takes a list of indices or aliases or a string which may be either and returns a list of indices
    // returns a list for multiple values or a string for a single.

    if (!indicesOrAliases) return indicesOrAliases;

    if (typeof indicesOrAliases === "string") indicesOrAliases = [indicesOrAliases];
    indicesOrAliases = $.map(indicesOrAliases, function (iOrA) {
      if (per_alias_indexes[iOrA]) return per_alias_indexes[iOrA];
      return [iOrA];
    });
    var ret = [].concat.apply([], indicesOrAliases);
    ret.sort();
    var last;
    ret = $.map(ret, function (v) {
      var r = last == v ? null : v;
      last = v;
      return r;
    });
    return ret.length > 1 ? ret : ret[0];
  }

  function getFields(indices, types) {
    // get fields for indices and types. Both can be a list, a string or null (meaning all).
    var ret = [];
    indices = expandAliases(indices);
    if (typeof indices == "string") {

      var type_dict = per_index_types[indices];
      if (!type_dict) return [];

      if (typeof types == "string") {
        var f = type_dict[types];
        ret = f ? f : [];
      }
      else {
        // filter what we need
        $.each(type_dict, function (type, fields) {
          if (!types || types.length == 0 || $.inArray(type, types) != -1)
            ret.push(fields);
        });

        ret = [].concat.apply([], ret);
      }
    }
    else {
      // multi index mode.
      $.each(per_index_types, function (index) {
        if (!indices || indices.length == 0 || $.inArray(index, indices) != -1)
          ret.push(getFields(index, types));
      });
      ret = [].concat.apply([], ret);
    }

    return _.uniq(ret, function (f) {
      return f.name + ":" + f.type
    });
  }

  function getTypes(indices) {
    var ret = [];
    indices = expandAliases(indices);
    if (typeof indices == "string") {
      var type_dict = per_index_types[indices];
      if (!type_dict) return [];

      // filter what we need
      $.each(type_dict, function (type, fields) {
        ret.push(type);
      });

    }
    else {
      // multi index mode.
      $.each(per_index_types, function (index) {
        if (!indices || $.inArray(index, indices) != -1)
          ret.push(getTypes(index));
      });
      ret = [].concat.apply([], ret);
    }

    return _.uniq(ret);

  }


  function getIndices(include_aliases) {
    var ret = [];
    $.each(per_index_types, function (index) {
      ret.push(index);
    });
    if (typeof include_aliases === "undefined" ? true : include_aliases) {
      $.each(per_alias_indexes, function (alias) {
        ret.push(alias);
      });
    }
    return ret;
  }

  function getFieldNamesFromFieldMapping(field_name, field_mapping) {
    if (field_mapping['enabled'] == false) return [];
    var nested_fields;

    function applyPathSettings(nested_field_names) {
      var path_type = field_mapping['path'] || "full";
      if (path_type == "full") {
        return $.map(nested_field_names, function (f) {
          f.name = field_name + "." + f.name;
          return f;
        });
      }
      return nested_field_names;
    }

    if (field_mapping["properties"]) {
      // derived object type
      nested_fields = getFieldNamesFromTypeMapping(field_mapping);
      return applyPathSettings(nested_fields);
    }

    var field_type = field_mapping['type'];

    if (field_type === 'multi_field') {
      nested_fields = $.map(field_mapping['fields'], function (field_mapping, field_name) {
        return getFieldNamesFromFieldMapping(field_name, field_mapping);
      });

      return applyPathSettings(nested_fields);
    }

    var ret = { name: field_name, type: field_type };

    if (field_mapping["index_name"])  ret.name = field_mapping["index_name"];

    return [ret];
  }

  function getFieldNamesFromTypeMapping(type_mapping) {
    var field_list =
      $.map(type_mapping['properties'], function (field_mapping, field_name) {
        return getFieldNamesFromFieldMapping(field_name, field_mapping);
      });

    // deduping
    return _.uniq(field_list, function (f) {
      return f.name + ":" + f.type
    });
  }

  function loadMappings(mappings) {
    per_index_types = {};
    $.each(mappings, function (index, index_mapping) {
      var normalized_index_mappings = {};
      $.each(index_mapping, function (type_name, type_mapping) {
        var field_list = getFieldNamesFromTypeMapping(type_mapping);
        normalized_index_mappings[type_name] = field_list;
      });
      per_index_types[index] = normalized_index_mappings;
    });
  }

  function loadAliases(aliases) {
    per_alias_indexes = {}
    $.each(aliases, function (index, index_aliases) {
      $.each(index_aliases.aliases, function (alias) {
        if (alias === index) return; // alias which is identical to index means no index.
        var cur_aliases = per_alias_indexes[alias];
        if (!cur_aliases) {
          cur_aliases = [];
          per_alias_indexes[alias] = cur_aliases;
        }
        cur_aliases.push(index);
      });
    });

    per_alias_indexes['_all'] = getIndices(false);
  }

  function clear() {
    per_index_types = {};
    per_alias_indexes = {};
  }

  function retrieveMappingFromServer() {
    if (!currentServer) return;
    utils.callES(currentServer, "_mapping", "GET", null, function (data, status, xhr) {
      loadMappings(data);
    });
    utils.callES(currentServer, "_aliases", "GET", null, function (data, status, xhr) {
      loadAliases(data);
    });

  }

  function notifyServerChange(newServer) {
    if (newServer.indexOf("://") < 0) newServer = "http://" + newServer;
    newServer = newServer.trim("/");
    if (newServer === currentServer) return; // already have it.
    currentServer = newServer;
    retrieveMappingFromServer();
  }

  function mapping_retriever() {
    retrieveMappingFromServer();
    setTimeout(function () {
      mapping_retriever();
    }, 60000);
  }

  mapping_retriever();

  return {
    getFields: getFields,
    getIndices: getIndices,
    getTypes: getTypes,
    loadMappings: loadMappings,
    loadAliases: loadAliases,
    expandAliases: expandAliases,
    clear: clear,
    notifyServerChange: notifyServerChange
  };

});

(function () {

   var global = window;
   var GLOBAL_AUTOCOMPLETE_RULES = {}, ES_SCHEME_BY_ENDPOINT = {};

   function escapeRegex(text) {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
   }

   function addGlobalAutocompleteRules(parentNode, rules) {
      GLOBAL_AUTOCOMPLETE_RULES[parentNode] = rules;
   }

   function getGlobalAutocompleteRules() {
      return GLOBAL_AUTOCOMPLETE_RULES;
   }


   function addEndpointDescription(endpoint, description) {
      if (!description.endpoint_autocomplete)
         description.endpoint_autocomplete = [endpoint];

      if (!description.match) {
         var l = $.map(description.endpoint_autocomplete, escapeRegex);
         description.match = "(?:" + l.join(")|(?:") + ")";
      }

      if (typeof description.match == "string") description.match = new RegExp(description.match);

      var copiedDescription = {};
      $.extend(copiedDescription, description);
      copiedDescription._id = endpoint;

      ES_SCHEME_BY_ENDPOINT[endpoint] = copiedDescription;
   }

   function getEndpointDescriptionByEndpoint(endpoint) {
      return ES_SCHEME_BY_ENDPOINT[endpoint];
   }

   function getEndpointsForIndicesTypesAndId(indices, types, id) {
      var ret = [];
      var index_mode = "none";
      if (indices && indices.length > 0) {
         indices = sense.mappings.expandAliases(indices);
         index_mode = typeof indices == "string" ? "single" : "multi";
      }

      var type_mode = "none";
      if (types && types.length > 0) type_mode = types.length > 1 ? "multi" : "single";
      var id_mode = "none";
      if (id && id.length > 0) id_mode = "single";

      for (var endpoint in ES_SCHEME_BY_ENDPOINT) {
         var scheme = ES_SCHEME_BY_ENDPOINT[endpoint];
         switch (scheme.indices_mode) {
            case "none":
               if (index_mode !== "none") continue;
               break;
            case "single":
               if (index_mode !== "single") continue;
               break;
            case "required_multi":
               if (index_mode === "none") continue;
               break;
            case "multi": // always good
               break;
         }
         switch (scheme.types_mode) {
            case "none":
               if (type_mode !== "none") continue;
               break;
            case "single":
               if (type_mode !== "single") continue;
               break;
            case "multi": // always good
               break;
         }

         switch (scheme.doc_id_mode) {
            case "none":
               if (id_mode !== "none") continue;
               break;
            case "required_single":
               if (id_mode === "none") continue;
               break;
         }

         ret.push(endpoint);
      }
      return ret;
   }

   function getEndpointDescriptionByPath(path, indices, types, id) {
      var endpoints = getEndpointsForIndicesTypesAndId(indices, types, id);
      for (var i = 0; i < endpoints.length; i++) {
         var scheme = ES_SCHEME_BY_ENDPOINT[endpoints[i]];
         if (scheme.match.test(path || "")) return scheme;
      }
      return null;
   }

   function getEndpointAutocomplete(indices, types, id) {
      var ret = [];
      var endpoints = getEndpointsForIndicesTypesAndId(indices, types, id);
      for (var i = 0; i < endpoints.length; i++) {
         var scheme = ES_SCHEME_BY_ENDPOINT[endpoints[i]];
         ret.push.apply(ret, scheme.endpoint_autocomplete);
      }
      return ret;
   }

   function clear() {
      ES_SCHEME_BY_ENDPOINT = {};
      GLOBAL_AUTOCOMPLETE_RULES = {};
   }

   if (!global.sense) global.sense = {};
   global.sense.kb = {};
   global.sense.kb.addGlobalAutocompleteRules = addGlobalAutocompleteRules;
   global.sense.kb.getGlobalAutocompleteRules = getGlobalAutocompleteRules;
   global.sense.kb.addEndpointDescription = addEndpointDescription;
   global.sense.kb.getEndpointAutocomplete = getEndpointAutocomplete;
   global.sense.kb.getEndpointDescriptionByPath = getEndpointDescriptionByPath;
   global.sense.kb.getEndpointDescriptionByEndpoint = getEndpointDescriptionByEndpoint;
   global.sense.kb.clear = clear;


})();
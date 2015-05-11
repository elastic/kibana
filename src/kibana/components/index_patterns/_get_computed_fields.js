// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');
  return function () {
    var self = this;
    var scriptFields = {};
    var fielddataFields = [];

    fielddataFields = _.pluck(self.fields.byType.date, 'name');

    _.each(self.getScriptedFields(), function (field) {
        
      //if the value of the script field ends with '.[knownscriptlang]'
      //then it is assumed to reference a script file and we use the 'script_file' param instead of 'script'
      var langs = ['groovy', 'expression', 'mustache', 'mvel', 'js', 'python'];
      function getLangUsedInScriptFile(scriptVal) {
          for (var i in langs) {
              var lang = langs[i];
              var suffix = "." + lang;
              if (scriptVal.toLowerCase().indexOf(suffix, scriptVal.length - suffix.length) !== -1) {
                //checks if scriptVal ends with suffix
                return lang;
              }
          }
          return false; //no match for any known lang
      }
      var scriptFileLang = getLangUsedInScriptFile(field.script);
      var scriptObj = {};
      if (scriptFileLang) {
          scriptObj.lang = scriptFileLang;
          //trim the extension from the script val and specify script_file as param
          scriptObj.script_file = field.script.substring(0, field.script.toLowerCase().indexOf("." + scriptFileLang));
      } else {//normal dynamic script
          scriptObj.lang = field.lang;
          scriptObj.script = field.script;
      }
      scriptFields[field.name] = scriptObj;
    });

    return {
      fields: ['*', '_source'],
      scriptFields: scriptFields,
      fielddataFields: fielddataFields
    };

  };
});

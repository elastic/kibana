define(function (require) {
  return function CheckEsVersionFn(Private, es, configFile, Notifier) {
    return function checkEsVersion() {
      var notify = new Notifier({ location: 'Setup: Elasticsearch version check' });
      var complete = notify.lifecycle('check es version');

      var SetupError = Private(require('../_setup_error'));


      // core expression for finding a version
      var versionExp = '([\\d\\.]*\\d)(?:\\.\\w+)?';

      /**
       * Regular Expression to extract a version number from a string
       * @type {RegExp}
       */
      var versionRE = new RegExp(versionExp);

      /**
       * Regular Expression to extract a version range from a string
       * @type {RegExp}
       */
      var versionRangeRE = new RegExp(versionExp + '\\s*\\-\\s*' + versionExp);

      var int = function (txt) {
        var i = parseInt(txt, 10);
        return (!i || isNaN(i)) ? 0 : i;
      };

      return es.info()
      .then(function (info) {
        var raw = info.version.number;
        var sections = raw.split('-');
        var someTypeOfBeta = sections.length > 1;
        var all = sections.shift().split('.');
        var major = int(all.shift());
        var minor = int(all.shift());
        var patch = int(all.shift());

        var currentRelease = major === 1 && minor >= 1;
        var betaPreRelease = major === 1 && minor === 0 && someTypeOfBeta;

        if (currentRelease || betaPreRelease) return true;
        else throw SetupError('Incompatible Elasticsearch version "' + raw + '". Expected version 1.1 or a 1.0-Beta release');
      })
      .then(complete, complete.failure);
    };
  };
});
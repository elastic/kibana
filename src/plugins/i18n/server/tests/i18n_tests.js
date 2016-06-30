import expect from 'expect.js';

var process = require('child_process');
var i18n = require('../i18n');

describe('Test plugin translations details for test_plugin_1', function () {
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

  it('2 translation languages exist', function (done) {
    var result = true;
    var expectedLanguages = ['en', 'de'];
    getPluginTranslationLanguages(pluginName, pluginTranslationPath, function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (actualLanguages.length !== expectedLanguages.length) {
          result = false;
        } else {
          var index = actualLanguages.length;
          actualLanguages.sort();
          expectedLanguages.sort();
          while (index--) {
            if (actualLanguages[index] !== expectedLanguages[index]) {
              result = false;
              break;
            }
          }
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('2 translation languages exist and wrongly expecting 1', function (done) {
    var result = true;
    var expectedLanguages = ['de'];
    getPluginTranslationLanguages(pluginName, pluginTranslationPath, function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (actualLanguages.length !== expectedLanguages.length) {
          result = false;
        } else {
          var index = actualLanguages.length;
          actualLanguages.sort();
          expectedLanguages.sort();
          while (index--) {
            if (actualLanguages[index] !== expectedLanguages[index]) {
              result = false;
              break;
            }
          }
        }
      }
      expect(result).to.be(false);
      done();
    });
  });

  it('Translation files exist', function (done) {
    var result = true;
    var expectedFiles = [
      pluginTranslationPath + '/view1/de.json',
      pluginTranslationPath + '/view1/en.json',
      pluginTranslationPath + '/view2/en.json'
    ];
    getPluginTranslationFiles(pluginName, pluginTranslationPath, function (err, actualFiles) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        if (actualFiles.length !== expectedFiles.length) {
          result = false;
        } else {
          var index = actualFiles.length;
          actualFiles.sort();
          expectedFiles.sort();
          while (index--) {
            if (actualFiles[index] !== expectedFiles[index]) {
              result = false;
              break;
            }
          }
        }
      }
      expect(result).to.be(true);
      done();
    });
  });
});

describe('Test registering translations for test_plugin_1', function () {
  var pluginName = 'test_plugin_1';
  var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

  it('Translation plugin bundle for English' , function (done) {
    var result = true;
    var language = 'en';

    i18n.registerPluginLanguageTranslations(pluginName, pluginTranslationPath, language, function (err) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        var expectedTranslationJsonFile = __dirname + '/data/reference/' + pluginName + '/' + language + '.json';
        var expectedTranslationJson = require(expectedTranslationJsonFile);
        expectedTranslationJson = JSON.stringify(expectedTranslationJson);
        i18n.getRegisteredPluginLanguageTranslations(pluginName, language, function (err, actualTranslationJson) {
          if (err) {
            console.log(err);
            result = false;
          } else {
            actualTranslationJson = JSON.stringify(actualTranslationJson);
            if (actualTranslationJson !== expectedTranslationJson) {
              result = false;
            }
          }
        });
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Languages are registered', function (done) {
    var expectedLanguages = ['en'];
    var result = true;

    i18n.getRegisteredPluginLanguages(pluginName, function (err, actualLanguages) {
      if (err) {
        console.log(err);
        result = false;
      }

      if (actualLanguages.length !== expectedLanguages.length) {
        result = false;
      } else {
        var index = actualLanguages.length;
        actualLanguages.sort();
        expectedLanguages.sort();
        while (index--) {
          if (actualLanguages[index] !== expectedLanguages[index]) {
            result = false;
            break;
          }
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  after(function (done) {
    var translationPluginStorePath = i18n.getRegisteredPluginStoragePath('test_plugin_1');
    process.execSync('rm -rf ' + translationPluginStorePath);
    done();
  });
});

describe('Test registering and retrieving all translations for test_plugin_1 and test_plugin_2', function () {

  it('Translation English bundle for test_plugin_1' , function (done) {
    var result = true;
    var language = 'en';
    var pluginName = 'test_plugin_1';
    var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

    i18n.registerPluginLanguageTranslations(pluginName, pluginTranslationPath, language, function (err) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        var expectedTranslationJsonFile = __dirname + '/data/reference/' + pluginName + '/' + language + '.json';
        var expectedTranslationJson = require(expectedTranslationJsonFile);
        expectedTranslationJson = JSON.stringify(expectedTranslationJson);
        i18n.getRegisteredPluginLanguageTranslations(pluginName, language, function (err, actualTranslationJson) {
          if (err) {
            console.log(err);
            result = false;
          } else {
            actualTranslationJson = JSON.stringify(actualTranslationJson);
            if (actualTranslationJson !== expectedTranslationJson) {
              result = false;
            }
          }
        });
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Translation English bundle for test_plugin_2' , function (done) {
    var result = true;
    var language = 'en';
    var pluginName = 'test_plugin_2';
    var pluginTranslationPath = __dirname + '/' + pluginName + '/translations';

    i18n.registerPluginLanguageTranslations(pluginName, pluginTranslationPath, language, function (err) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        var expectedTranslationJsonFile = __dirname + '/data/reference/' + pluginName + '/' + language + '.json';
        var expectedTranslationJson = require(expectedTranslationJsonFile);
        expectedTranslationJson = JSON.stringify(expectedTranslationJson);
        i18n.getRegisteredPluginLanguageTranslations(pluginName, language, function (err, actualTranslationJson) {
          if (err) {
            console.log(err);
            result = false;
          } else {
            actualTranslationJson = JSON.stringify(actualTranslationJson);
            if (actualTranslationJson !== expectedTranslationJson) {
              result = false;
            }
          }
        });
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Compare registerd translations for test_plugin_1 and test_plugin_2' , function (done) {
    var result = true;
    var language = 'en';
    var expectedTranslationJson = [
      {'NO_SSL':'Dont run the dev server using HTTPS',
        'DEV':'Run the server with development mode defaults'},
      {'NO_RUN_SERVER':'Dont run the dev server',
        'HOME':'Run along home now!'},
      {'XXXXXX':'This is XXXXXX string',
        'YYYY_PPPP':'This is YYYY_PPPP string'},
      {'FFFFFFFFFFFF':'This is FFFFFFFFFFFF string',
        'ZZZ':'This is ZZZ string'}];

    i18n.getAllRegisteredPluginsLanguageTranslations(language, function (err, actualTranslationJson) {
      if (err) {
        console.log(err);
        result = false;
      } else {
        actualTranslationJson = actualTranslationJson.sort(compareLists);
        expectedTranslationJson = expectedTranslationJson.sort(compareLists);
        if (JSON.stringify(actualTranslationJson) !== JSON.stringify(expectedTranslationJson)) {
          result = false;
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  it('Common supported plugin languages for test_plugin_1 and test_plugin_2' , function (done) {
    var result = true;
    var expectedCommonLanguages = ['en'];

    i18n.getAllRegisteredPluginsCommonSupportedLanguages(function (err, actualCommonLanguages) {
      if (err) {
        console.log(err);
        result = false;
      }

      if (actualCommonLanguages.length !== expectedCommonLanguages.length) {
        result = false;
      } else {
        var index = actualCommonLanguages.length;
        actualCommonLanguages.sort();
        expectedCommonLanguages.sort();
        while (index--) {
          if (actualCommonLanguages[index] !== expectedCommonLanguages[index]) {
            result = false;
            break;
          }
        }
      }
      expect(result).to.be(true);
      done();
    });
  });

  after(function (done) {
    var translationPluginStorePath = i18n.getRegisteredPluginStoragePath('test_plugin_1');
    process.execSync('rm -rf ' + translationPluginStorePath);
    translationPluginStorePath = i18n.getRegisteredPluginStoragePath('test_plugin_2');
    process.execSync('rm -rf ' + translationPluginStorePath);
    done();
  });
});

function getPluginTranslationLanguages(pluginName, pluginTranslationPath, cb) {
  var translationFiles = [];
  var languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);
    return cb(null, languageList);
  });
}

function getPluginTranslationFiles(pluginName, pluginTranslationPath, cb) {
  var translationFiles = [];
  var languageList = [];
  i18n.getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);
    return cb(null, translationFiles);
  });
}

function compareLists(a, b) {
  if (Object.keys(a)[0] > Object.keys(b)[0]) {
    return 1;
  }
  if (Object.keys(a)[0] < Object.keys(b)[0]) {
    return -1;
  }
  return 0;
}

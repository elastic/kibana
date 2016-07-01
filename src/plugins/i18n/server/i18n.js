var async = require('async');
var fs = require('fs');
var kibanaPackage = require('../../../utils/package_json');
var mkdirp = require('mkdirp');
var os = require('os');
var path = require('path');
var process = require('child_process');

const TRANSLATION_FILE_EXTENSION = 'json';
const TRANSLATION_STORE_PATH = kibanaPackage.__dirname + '/data/translations';

var getPluginTranslationDetails = function (pluginTranslationPath, translationFiles, languageList, callback) {
  try {
    getFilesRecursivelyFromTopDir(pluginTranslationPath, translationFiles, languageList);
  } catch (err) {
    return callback(err);
  }
  return callback(null);
};

//TODO(hickeyma): Update to use https://github.com/elastic/kibana/pull/7562
var getTranslationStoragePath = function () {
  return TRANSLATION_STORE_PATH;
};

var getRegisteredTranslationLanguages = function (cb) {
  var translationFiles = [];
  var languageList = [];
  var translationStorePath = getTranslationStoragePath();
  try {
    getTranslationDetailsFromDirectory(translationStorePath, translationFiles, languageList);
  } catch (err) {
    return cb(err);
  }
  return cb(null, languageList);
};

var registerTranslations = function (pluginTranslationPath, cb) {
  var translationFiles = [];
  var languageList = [];
  var translationStorePath = getTranslationStoragePath();

  getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList, function (err) {
    if (err) return cb(err);

    try {
      if (!fs.existsSync(translationStorePath)) {
        mkdirp.sync(translationStorePath);
      }
      for (var fileIndx in translationFiles) {
        if (!translationFiles.hasOwnProperty(fileIndx)) continue;
        var translationFile = translationFiles[fileIndx];
        var translationFileName = getFileName(translationFile);
        var translationJson = require(translationFile);
        var fileToWrite = translationStorePath + '/' + translationFileName;
        saveTranslationToFile(fileToWrite, translationJson);
      }
    } catch (err) {
      return cb(err);
    }
  });

  return cb(null);
};

var getRegisteredLanguageTranslations = function (language, callback) {
  var translationStorePath = getTranslationStoragePath();
  var translationFileName = language + '.' + TRANSLATION_FILE_EXTENSION;
  var translationFile = translationStorePath + '/' + translationFileName;
  fs.readFile(translationFile, function (err, translationStr) {
    if (err) return callback(err);
    var translationJson = [];
    try {
      translationJson = JSON.parse(translationStr);
    } catch (e) {
      return callback('Bad ' + language + ' translation strings. Error: ' + err);
    }
    return callback(null, translationJson);
  });
};

function saveTranslationToFile(translationFullFileName, translationToAddJson) {
  var jsonToWrite = [];
  if (fs.existsSync(translationFullFileName)) {
    var currentTranslationJson = require(translationFullFileName);
    jsonToWrite = currentTranslationJson;
    for (var key in translationToAddJson) {
      if (translationToAddJson.hasOwnProperty(key)) {
        var attrName = key;
        var attrValue = translationToAddJson[key];
        jsonToWrite[attrName] = attrValue;
      }
    }
  } else {
    jsonToWrite = translationToAddJson;
  }
  fs.writeFileSync(translationFullFileName, JSON.stringify(jsonToWrite));
}

function getFilesRecursivelyFromTopDir(topDir, translationFiles, languageList) {
  fs.readdirSync(topDir).forEach(function (name) {
    var fullPath = path.join(topDir, name);
    var stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList);
    }
  });
}

function getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList) {
  var files = getFilesFromDir(fullPath);
  var fileLength = files.length;
  for (var i = 0; i < fileLength; i++) {
    var fullFilePath = files[i];
    var fileName = getFileName(fullFilePath);
    var fileExt = fileName.split('.').pop();
    if (fileName === fileExt) continue;
    if (fileExt !== TRANSLATION_FILE_EXTENSION) continue;
    translationFiles.push(fullFilePath);
    var lang  = fileName.substr(0, fileName.lastIndexOf('.'));
    if (languageList.indexOf(lang) !== -1) {
      continue;
    }
    languageList.push(lang);
  }
}

function getFilesFromDir(dir) {
  var fileList = [];

  var files = fs.readdirSync(dir);
  for (var i in files) {
    if (!files.hasOwnProperty(i)) continue;
    var name = dir + '/' + files[i];
    if (!fs.statSync(name).isDirectory()) {
      fileList.push(name);
    }
  }
  return fileList;
}

function getFileName(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLanguageTranslations = getRegisteredLanguageTranslations;
module.exports.getTranslationStoragePath = getTranslationStoragePath;
module.exports.getRegisteredTranslationLanguages = getRegisteredTranslationLanguages;
module.exports.getPluginTranslationDetails = getPluginTranslationDetails;

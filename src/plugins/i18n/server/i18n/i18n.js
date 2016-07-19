import fs from 'fs';
import kibanaPackage from '../../../../utils/package_json';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import process from 'child_process';
import Promise from 'bluebird';

const join = Promise.join;
const readdir = Promise.promisify(fs.readdir);
const readFile = Promise.promisify(fs.readFile);
const stat = Promise.promisify(fs.stat);
const writeFile = Promise.promisify(fs.writeFile);
const mkdirpAsync = Promise.promisify(mkdirp);

const TRANSLATION_FILE_EXTENSION = 'json';
const TRANSLATION_STORE_PATH = kibanaPackage.__dirname + '/fixtures/translations';

const getPluginTranslationDetails = function (pluginTranslationPath, translationFiles, languageList) {
  return getFilesRecursivelyFromTopDir(pluginTranslationPath, translationFiles, languageList);
};

//TODO(hickeyma): Update to use https://github.com/elastic/kibana/pull/7562
const getTranslationStoragePath = function () {
  return TRANSLATION_STORE_PATH;
};

const getRegisteredTranslationLanguages = function () {
  let translationFiles = [];
  let languageList = [];
  const translationStorePath = getTranslationStoragePath();

  return getTranslationDetailsFromDirectory(translationStorePath, translationFiles, languageList).then(function () {
    return languageList;
  });
};

const registerTranslations = function (pluginTranslationPath) {
  let translationFiles = [];
  let languageList = [];
  const translationStorePath = getTranslationStoragePath();

  return join(createTranslationDirectory(translationStorePath),
    getPluginTranslationDetails(pluginTranslationPath, translationFiles, languageList),
    function () {
      return Promise.map(translationFiles, (translationFile) => {
        const translationFileName = getFileName(translationFile);
        const translationJson = require(translationFile);
        const fileToWrite = translationStorePath + '/' + translationFileName;
        return getTranslationJsonToWrite(fileToWrite, translationJson).then((jsonToWrite) => {
          return writeFile(fileToWrite, JSON.stringify(jsonToWrite));
        });
      });
    });
};

const getRegisteredLanguageTranslations = function (language) {
  const translationStorePath = getTranslationStoragePath();
  const translationFileName = language + '.' + TRANSLATION_FILE_EXTENSION;
  const translationFile = translationStorePath + '/' + translationFileName;

  return readFile(translationFile, 'utf8').then(function (translationStr) {
    let translationJson = [];
    try {
      translationJson = JSON.parse(translationStr);
    } catch (err) {
      throw new Error('Bad ' + language + ' translation strings. Reason: ' + err);
    }
    return translationJson;
  }).catch(function (e) {
    throw new Error('Failed to read translation file. Reason: ' + e);
  });
};

function saveTranslationToFile(translationFullFileName, translationToAddJson) {
  return getTranslationJsonToWrite(translationFullFileName).then(function (jsonToWrite) {
    return writeFile(translationFullFileName, JSON.stringify(jsonToWrite));
  });
}

function getTranslationJsonToWrite(translationFullFileName, translationToAddJson) {
  return stat(translationFullFileName).then((stats) => {
    let jsonToWrite = [];
    const currentTranslationJson = require(translationFullFileName);
    jsonToWrite = currentTranslationJson;
    for (let key in translationToAddJson) {
      if (translationToAddJson.hasOwnProperty(key)) {
        const attrName = key;
        const attrValue = translationToAddJson[key];
        jsonToWrite[attrName] = attrValue;
      }
    }
    return jsonToWrite;
  }).catch(function (e) {
    return translationToAddJson;
  });
}

function createTranslationDirectory(translationStorePath) {
  return stat(translationStorePath).then((stats) => {
  }).catch(function (e) {
    return mkdirpAsync(translationStorePath);
  });
}

function getFilesRecursivelyFromTopDir(topDir, translationFiles, languageList) {
  return readdir(topDir).then((topDirectoryListing) => {
    return Promise.map(topDirectoryListing, (listing) => {
      const fullPath = path.join(topDir, listing);
      return stat(fullPath).then((stats) => {
        if (stats.isDirectory()) {
          getTranslationDetailsFromDirectory(fullPath, translationFiles, languageList);
        } else {
          getTranslationDetailsFromFile(fullPath, translationFiles, languageList);
        }
      });
    });
  });
}

function getTranslationDetailsFromDirectory(dir, translationFiles, languageList) {
  return readdir(dir).then((dirListing) => {
    return Promise.map(dirListing, (listing) => {
      const fullPath = path.join(dir, listing);
      return stat(fullPath).then((stats) => {
        if (!stats.isDirectory()) {
          getTranslationDetailsFromFile(fullPath, translationFiles, languageList);
        }
      });
    });
  });
}

function getTranslationDetailsFromFile(fullFileName, translationFiles, languageList) {
  const fileName = getFileName(fullFileName);
  const fileExt = fileName.split('.').pop();

  if (fileName === fileExt) return;
  if (fileExt !== TRANSLATION_FILE_EXTENSION) return;
  translationFiles.push(fullFileName);
  const lang  = fileName.substr(0, fileName.lastIndexOf('.'));
  if (languageList.indexOf(lang) === -1) {
    languageList.push(lang);
  }
}

function getFileName(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLanguageTranslations = getRegisteredLanguageTranslations;
module.exports.getTranslationStoragePath = getTranslationStoragePath;
module.exports.getRegisteredTranslationLanguages = getRegisteredTranslationLanguages;
module.exports.getPluginTranslationDetails = getPluginTranslationDetails;

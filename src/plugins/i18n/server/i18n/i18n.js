import fs from 'fs';
import kibanaPackage from '../../../../utils/package_json';
import mkdirp from 'mkdirp';
import path from 'path';
import Promise from 'bluebird';

const readdir = Promise.promisify(fs.readdir);
const readFile = Promise.promisify(fs.readFile);
const stat = Promise.promisify(fs.stat);
const writeFile = Promise.promisify(fs.writeFile);
const mkdirpAsync = Promise.promisify(mkdirp);

const PATH_SEPARATOR = path.sep;
const TRANSLATION_FILE_EXTENSION = 'json';
const TRANSLATION_STORE_PATH = kibanaPackage.__dirname + PATH_SEPARATOR + 'fixtures' + PATH_SEPARATOR + 'translations';

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

const registerTranslations = function (absolutePluginTranslationFilePath) {
  const translationStorePath = getTranslationStoragePath();

  return createTranslationDirectory(translationStorePath).then(() => {
    return storeTranslations(absolutePluginTranslationFilePath, translationStorePath);
  });
};

const getRegisteredLanguageTranslations = function (language) {
  const translationStorePath = getTranslationStoragePath();
  const translationFileName = language + '.' + TRANSLATION_FILE_EXTENSION;
  const translationFile = translationStorePath + PATH_SEPARATOR + translationFileName;

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

function storeTranslations(absolutePluginTranslationFilePath, translationStorePath) {
  const translationFileName = getFileName(absolutePluginTranslationFilePath);
  const translationJson = require(absolutePluginTranslationFilePath);
  const fileToWrite = translationStorePath + PATH_SEPARATOR + translationFileName;
  return getTranslationJsonToWrite(fileToWrite, translationJson).then((jsonToWrite) => {
    return writeFile(fileToWrite, JSON.stringify(jsonToWrite));
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

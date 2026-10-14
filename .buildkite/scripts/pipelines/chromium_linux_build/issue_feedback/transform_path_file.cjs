/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-check

const assert = require('assert');

/**
 * @typedef ChromiumUpdateConfig
 * @property {string} archiveChecksum
 * @property {string} binaryChecksum
 */

/**
 *
 * @typedef ExtraChromiumUpdateConfig
 * @property {string} archiveFilename
 */

/**
 * @typedef ChromiumUpdateConfigMap
 * @property {ChromiumUpdateConfig} mac_arm64
 * @property {ChromiumUpdateConfig} mac_x64
 * @property {ChromiumUpdateConfig} win64
 * @property {ChromiumUpdateConfig & ExtraChromiumUpdateConfig} linux_arm64
 * @property {ChromiumUpdateConfig & ExtraChromiumUpdateConfig} linux_x64
 */

/**
 * @typedef transformOptions
 * @property {string} chromiumVersion
 * @property {ChromiumUpdateConfigMap} updateConfig
 */

/**
 * @param {*} file
 * @param {import('jscodeshift').API} api
 * @param {transformOptions} options
 * @returns
 */
module.exports = function transformer(file, api, options) {
  const j = api.jscodeshift;

  assert.ok(Object.values(options).length, 'Expected options to be defined');
  assert.ok(options.chromiumVersion, 'Expected version to be defined');
  assert.ok(options.updateConfig, 'Expected updateConfig to be defined');
  assert.ok(options.updateConfig.linux_arm64, 'Expected linux_arm64 update config to be defined');
  assert.ok(options.updateConfig.linux_x64, 'Expected linux_x64 update config to be defined');
  assert.ok(options.updateConfig.mac_arm64, 'Expected mac_arm64 update config to be defined');
  assert.ok(options.updateConfig.mac_x64, 'Expected mac_x64 update config to be defined');
  assert.ok(options.updateConfig.win64, 'Expected win64 update config to be defined');

  const root = j(file.source);

  const packagesPropertyDefinition = root
    .find(j.ClassDeclaration, {
      id: { name: 'ChromiumArchivePaths' },
    })
    .find(j.ClassProperty, {
      key: { name: 'packages' },
    });

  assert(
    packagesPropertyDefinition.size() === 1,
    'Expected to find a single packages definition on ChromiumArchivePaths'
  );

  const packagesArray = packagesPropertyDefinition.find(j.ArrayExpression);

  /**
   * @param {import('jscodeshift').ObjectExpression['properties'][number]} property
   * @param {string} propertyKey
   * @param {string} propertyValue
   */
  const setPropertyValue = (property, propertyKey, propertyValue) => {
    if (
      property.type === 'ObjectProperty' &&
      property.key.type === 'Identifier' &&
      property.key.name === propertyKey
    ) {
      property.value = j.literal(propertyValue);
    }
  };

  // Traverse each package object in the array
  packagesArray.find(j.ObjectExpression).forEach((path) => {
    path.node.properties.forEach((property, _, _properties) => {
      if (
        property.type === 'ObjectProperty' &&
        property.key.type === 'Identifier' &&
        property.key.name === 'version'
      ) {
        property.value = j.literal(options.chromiumVersion);
      }

      if (
        property.type === 'ObjectProperty' &&
        property.key.type === 'Identifier' &&
        property.key.name === 'archivePath' &&
        property.value.type === 'StringLiteral' &&
        property.value.value === 'mac-x64'
      ) {
        _properties.forEach((property) => {
          setPropertyValue(
            property,
            'archiveChecksum',
            options.updateConfig.mac_x64.archiveChecksum
          );
          setPropertyValue(property, 'binaryChecksum', options.updateConfig.mac_x64.binaryChecksum);
        });
      }

      if (
        property.type === 'ObjectProperty' &&
        property.key.type === 'Identifier' &&
        property.key.name === 'archivePath' &&
        property.value.type === 'StringLiteral' &&
        property.value.value === 'mac-arm64'
      ) {
        _properties.forEach((property) => {
          setPropertyValue(
            property,
            'archiveChecksum',
            options.updateConfig.mac_arm64.archiveChecksum
          );
          setPropertyValue(
            property,
            'binaryChecksum',
            options.updateConfig.mac_arm64.binaryChecksum
          );
        });
      }

      if (
        property.type === 'ObjectProperty' &&
        property.key.type === 'Identifier' &&
        property.key.name === 'archivePath' &&
        property.value.type === 'StringLiteral' &&
        property.value.value === 'win64'
      ) {
        _properties.forEach((property) => {
          setPropertyValue(property, 'archiveChecksum', options.updateConfig.win64.archiveChecksum);
          setPropertyValue(property, 'binaryChecksum', options.updateConfig.win64.binaryChecksum);
        });
      }

      if (
        property.type === 'ObjectProperty' &&
        property.key.type === 'Identifier' &&
        property.key.name === 'binaryRelativePath' &&
        property.value.type === 'StringLiteral' &&
        /linux_x64/.test(property.value.value)
      ) {
        _properties.forEach((property) => {
          setPropertyValue(
            property,
            'archiveChecksum',
            options.updateConfig.linux_x64.archiveChecksum
          );
          setPropertyValue(
            property,
            'binaryChecksum',
            options.updateConfig.linux_x64.binaryChecksum
          );
          setPropertyValue(
            property,
            'archiveFilename',
            options.updateConfig.linux_x64.archiveFilename
          );
        });
      }

      if (
        property.type === 'ObjectProperty' &&
        property.key.type === 'Identifier' &&
        property.key.name === 'binaryRelativePath' &&
        property.value.type === 'StringLiteral' &&
        /linux_arm64/.test(property.value.value)
      ) {
        _properties.forEach((property) => {
          setPropertyValue(
            property,
            'archiveChecksum',
            options.updateConfig.linux_arm64.archiveChecksum
          );
          setPropertyValue(
            property,
            'binaryChecksum',
            options.updateConfig.linux_arm64.binaryChecksum
          );
          setPropertyValue(
            property,
            'archiveFilename',
            options.updateConfig.linux_arm64.archiveFilename
          );
        });
      }
    });
  });

  return root.toSource();
};

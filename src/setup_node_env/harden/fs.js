/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */
const { fsEventBus, FS_CONFIG_EVENT } = require('@kbn/security-hardening/fs-event-bus');

const { getSafePath, validateAndSanitizeFileData, isDevOrCI } = require('./fs_validations');

// eslint-disable-next-line no-unused-vars
let hardeningConfig = null;

// IMPORTANT: this is used for POC, however we can consider using preboot plugin to pass the config down
fsEventBus.on(FS_CONFIG_EVENT, (config) => {
  hardeningConfig = config;
});

const shouldEnableHardenedFs = () => {
  const isJestTest = Boolean(process.env.JEST_WORKER_ID);

  // If the hardening config is not set or disabled, we also skip
  return (
    // Boolean(hardeningConfig?.enabled) &&
    !isJestTest || (isJestTest && process.env.KBN_ENABLE_HARDENED_FS)
  );
};

// Since that is a stream, we don't validate the data here, but we do ensure that the path is safe
const patchWriteStream = (target, thisArg, argumentsList) => {
  if (!shouldEnableHardenedFs()) {
    return target.apply(thisArg, argumentsList);
  }

  const [userPath, ...args] = argumentsList;
  const safePath = getSafePath(userPath);

  return target.apply(thisArg, [safePath, ...args]);
};

const patchSingleMethod = (target, thisArg, argumentsList) => {
  if (!shouldEnableHardenedFs()) {
    return target.apply(thisArg, argumentsList);
  }

  const [userPath, data, ...args] = argumentsList;
  const safePath = getSafePath(userPath);
  const safeData = validateAndSanitizeFileData(data, safePath);

  return target.apply(thisArg, [safePath, safeData, ...args]);
};

const patchDualMethod = (target, thisArg, argumentsList) => {
  if (!shouldEnableHardenedFs()) {
    return target.apply(thisArg, argumentsList);
  }

  const [userSrc, userDest, ...args] = argumentsList;
  const srcSafePath = getSafePath(userSrc);
  const destSafePath = getSafePath(userDest);

  return target.apply(thisArg, [srcSafePath, destSafePath, ...args]);
};

const patchAsyncSingleMethod = (target, thisArg, argumentsList) => {
  if (!shouldEnableHardenedFs()) {
    return target.apply(thisArg, argumentsList);
  }

  const [userPath, data, options, cb] = argumentsList;
  const callback = typeof options === 'function' ? options : cb;
  let safePath;
  let safeData;

  try {
    safePath = getSafePath(userPath);
    safeData = validateAndSanitizeFileData(data, safePath);
  } catch (err) {
    // ensure that we invoke the callback asynchronously
    if (typeof callback === 'function') return process.nextTick(() => callback(err));

    throw err;
  }

  return target.apply(thisArg, [safePath, safeData, options, cb]);
};

const patchAsyncDualMethod = (target, thisArg, argumentsList) => {
  if (!shouldEnableHardenedFs()) {
    return target.apply(thisArg, argumentsList);
  }

  const [userSrc, userDest, ...args] = argumentsList;
  const [modeOrCallback, callbackArg] = args;
  const callback = typeof modeOrCallback === 'function' ? modeOrCallback : callbackArg;
  let srcSafePath;
  let destSafePath;

  try {
    srcSafePath = getSafePath(userSrc);
    destSafePath = getSafePath(userDest);
  } catch (err) {
    // ensure that we invoke the callback asynchronously
    if (typeof callback === 'function') return process.nextTick(() => callback(err));

    throw err;
  }

  return target.apply(thisArg, [srcSafePath, destSafePath, ...args]);
};

const pathUnsecureMethod = (target, thisArg, argumentsList) => {
  if (!shouldEnableHardenedFs() || isDevOrCI) {
    return target.apply(thisArg, argumentsList);
  }

  throw new Error('This method is blocked by security hardening');
};

const createFsProxy = (fs) => {
  fs.writeFileSync = new Proxy(fs.writeFileSync, { apply: patchSingleMethod });
  fs.writeFile = new Proxy(fs.writeFile, { apply: patchAsyncSingleMethod });
  fs.copyFileSync = new Proxy(fs.copyFileSync, { apply: patchDualMethod });
  fs.copyFile = new Proxy(fs.copyFile, { apply: patchAsyncDualMethod });

  fs.appendFileSync = new Proxy(fs.appendFileSync, { apply: patchSingleMethod });
  fs.appendFile = new Proxy(fs.appendFile, { apply: patchAsyncSingleMethod });
  fs.createWriteStream = new Proxy(fs.createWriteStream, { apply: patchWriteStream });

  // Methods that we want to block completely in runtime
  fs.openSync = new Proxy(fs.openSync, { apply: pathUnsecureMethod });
  fs.symlink = new Proxy(fs.symlink, { apply: pathUnsecureMethod });
  fs.symlinkSync = new Proxy(fs.symlinkSync, { apply: pathUnsecureMethod });

  return fs;
};

const createFsPromisesProxy = (fs) => {
  fs.writeFile = new Proxy(fs.writeFile, { apply: patchSingleMethod });
  fs.appendFile = new Proxy(fs.appendFile, { apply: patchSingleMethod });

  return fs;
};

module.exports = { createFsProxy, createFsPromisesProxy };

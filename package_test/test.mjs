/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import packages from './search.json' assert { type: 'json' };
import semver from 'semver';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'kbn-xsrf': 'f62a882f-7df0-4cf2-bd46-13566b795301',
  Authorization: 'Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
};

const installPackage = async (version) => {
  let data = JSON.stringify({
    force: true,
  });

  return axios.request({
    method: 'post',
    maxBodyLength: Infinity,
    url: `http://localhost:5601/kbn/api/fleet/epm/packages/security_detection_engine/${version}`,
    headers: {
      ...headers,
      'elastic-api-version': '2023-10-31',
    },
    data,
  });
};

const installAllRules = async () => {
  let data = JSON.stringify({
    mode: 'ALL_RULES',
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://localhost:5601/kbn/internal/detection_engine/prebuilt_rules/installation/_perform',
    headers: {
      ...headers,
      'elastic-api-version': '1',
    },
    data,
  };

  return axios.request(config);
};

const reviewUpgrade = async () => {
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://localhost:5601/kbn/internal/detection_engine/prebuilt_rules/upgrade/_review',
    headers: {
      ...headers,
      'elastic-api-version': '1',
    },
  };

  return axios.request(config);
};

const performUpgrade = async () => {
  let data = JSON.stringify({
    mode: 'ALL_RULES',
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://localhost:5601/kbn/internal/detection_engine/prebuilt_rules/upgrade/_perform',
    headers: {
      ...headers,
      'elastic-api-version': '1',
    },
    data: data,
  };

  return axios.request(config);
};

const deleteAllRules = async () => {
  let data = JSON.stringify({
    action: 'delete',
    query: '',
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://localhost:5601/kbn/api/detection_engine/rules/_bulk_action?dry_run=false',
    headers: {
      ...headers,
      'elastic-api-version': '2023-10-31',
    },
    data: data,
  };

  return axios.request(config);
};

const filtered = packages
  .filter((pkg) => pkg.conditions.kibana.version.startsWith('^8'))
  .sort((a, b) => semver.compare(a.version, b.version));

const resultsDir = path.resolve('./results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

for (const pkg of filtered) {
  const { version } = pkg;
  const performFilePath = path.join(resultsDir, `${version}_perform.json`);

  if (fs.existsSync(performFilePath)) {
    console.log(`Skipping version ${version} as it has already been processed.`);
    continue;
  }

  try {
    console.log('Deleting all rules');
    await deleteAllRules();

    console.log(`Installing package ${pkg.name} version ${version}`);
    await installPackage(version);

    console.log(`Installing all rules`);
    const installAllRulesResponse = await installAllRules();
    const installAllRulesData = JSON.stringify(installAllRulesResponse.data, null, 2);
    fs.writeFileSync(path.join(resultsDir, `${version}_install.json`), installAllRulesData);

    console.log(`Installing the latest package`);
    await installPackage('8.17.1');

    console.log('Reviewing upgrade');
    const reviewResponse = await reviewUpgrade();
    const reviewData = JSON.stringify(reviewResponse.data, null, 2);
    fs.writeFileSync(path.join(resultsDir, `${version}_review.json`), reviewData);

    console.log('Performing upgrade');
    const performResponse = await performUpgrade();
    const performData = JSON.stringify(performResponse.data, null, 2);
    fs.writeFileSync(performFilePath, performData);
  } catch (error) {
    console.error(`Error processing version ${version}:`, error);
  }
}

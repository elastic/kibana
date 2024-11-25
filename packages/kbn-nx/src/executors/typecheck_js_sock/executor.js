/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */

const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');
const net = require('net');

const SOCKET_PATH = '/tmp/typecheck-service.sock';

module.exports = function typecheckExecutor(options, context) {
  if (!context.projectName) {
    throw new Error('Project name not present in project.json - please add that field.');
  }

  const projectConfig = context.projectsConfigurations.projects[context.projectName];
  const projectRoot = projectConfig.root;
  const assumedProjectTsConfig = path.join(projectRoot, 'tsconfig.type_check.json');

  if (!fs.existsSync(assumedProjectTsConfig)) {
    throw new Error(`No tsconfig.type_check.json found at ${assumedProjectTsConfig}`);
  }

  try {
    fs.rmSync(path.join(REPO_ROOT, projectRoot, 'target'), { recursive: true });
  } catch (e) {
    // ignore
    console.log('Error cleaning target directory:', e);
  }

  console.info('Starting typecheck for project: ' + context.projectName);
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const client = net.createConnection(SOCKET_PATH, () => {
      console.log('Connected to type-checking service');
      // Send a message to start type-checking or other commands
      const fullPath = path.join(REPO_ROOT, projectRoot);
      client.write(JSON.stringify({ command: 'typecheck', filePath: fullPath }));
    });

    client.on('data', (dataBuffer) => {
      const data = JSON.parse(dataBuffer.toString());
      console.log('Received:', data);
      const typecheckTime = Date.now() - startTime;
      const { success, diagnostics, error } = data;
      if (!success) {
        console.error(`Typecheck failed for ${context.projectName} after ${typecheckTime}ms`);
        console.error(diagnostics, error);
        resolve({ success: false });
      } else {
        console.info(`Typecheck successful for ${context.projectName} in ${typecheckTime}ms`);
        if (diagnostics) {
          console.info(diagnostics);
        }
        resolve({ success: true });
      }
    });

    client.on('error', (error) => {
      console.error('Connection error:', error);
      reject(error);
    });
  }).finally(() => {
    const typecheckTime = Date.now() - startTime;
    writeStats('node-ipc', typecheckTime, context.projectName);
  });
};

function writeStats(postfix, time, projectName) {
  const postfixSlug = postfix.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const statsPath = path.resolve(REPO_ROOT, 'target', `typecheck-stats-${postfixSlug}.json`);
  fs.appendFileSync(statsPath, JSON.stringify({ time, projectName }) + '\n');
}

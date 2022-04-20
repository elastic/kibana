/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import { ToolingLog } from '@kbn/tooling-log';

import { exec, Config, Build } from '../../lib';

export async function runFpm(
  config: Config,
  log: ToolingLog,
  build: Build,
  type: 'rpm' | 'deb',
  architecture: 'arm64' | 'x64',
  pkgSpecificFlags: string[]
) {
  const linux = config.getPlatform('linux', architecture);
  const version = config.getBuildVersion();

  const resolveWithTrailingSlash = (...paths: string[]) => `${resolve(...paths)}/`;

  const fromBuild = (...paths: string[]) => build.resolvePathForPlatform(linux, ...paths);

  const pickLicense = () => {
    return type === 'rpm' ? 'Elastic License' : 'Elastic-License';
  };

  const envFolder = type === 'rpm' ? 'sysconfig' : 'default';

  const args = [
    // Force output even if it will overwrite an existing file
    '--force',

    // define the type for this package
    '-t',
    type,

    // we force dashes in the version file name because otherwise fpm uses
    // the filtered package version, which would have dashes replaced with
    // underscores
    '--package',
    config.resolveFromTarget(`NAME-${version}-ARCH.TYPE`),

    // input type
    '-s',
    'dir',

    // general info about the package
    '--name',
    'kibana',
    '--description',
    'Explore and visualize your Elasticsearch data',
    '--version',
    version,
    '--url',
    'https://www.elastic.co',
    '--vendor',
    'Elasticsearch, Inc.',
    '--maintainer',
    'Kibana Team <info@elastic.co>',
    '--license',
    pickLicense(),

    // define install/uninstall scripts
    '--after-install',
    resolve(__dirname, 'package_scripts/post_install.sh'),
    '--before-install',
    resolve(__dirname, 'package_scripts/pre_install.sh'),
    '--before-remove',
    resolve(__dirname, 'package_scripts/pre_remove.sh'),
    '--after-remove',
    resolve(__dirname, 'package_scripts/post_remove.sh'),
    '--rpm-posttrans',
    resolve(__dirname, 'package_scripts/post_trans.sh'),

    // for RHEL 8+ package verification
    '--rpm-digest',
    'sha256',

    // tell fpm about the config file so that it is called out in the package definition
    '--config-files',
    `/etc/kibana/kibana.yml`,

    // define template values that will be injected into the install/uninstall
    // scripts, also causes scripts to be processed with erb
    '--template-value',
    `user=kibana`,
    '--template-value',
    `group=kibana`,
    '--template-value',
    `configDir=/etc/kibana`,
    '--template-value',
    `pluginsDir=/usr/share/kibana/plugins`,
    '--template-value',
    `dataDir=/var/lib/kibana`,
    '--template-value',
    `logDir=/var/log/kibana`,
    '--template-value',
    `pidDir=/run/kibana`,
    '--template-value',
    `envFile=/etc/default/kibana`,
    // config and data directories are copied to /usr/share and /var/lib
    // below, so exclude them from the main package source located in
    // /usr/share/kibana/config. PATHS MUST BE RELATIVE, so drop the leading slash
    '--exclude',
    `usr/share/kibana/config`,
    '--exclude',
    `usr/share/kibana/data`,
    '--exclude',
    `usr/share/kibana/logs`,
    '--exclude',
    'run/kibana/.gitempty',

    // flags specific to the package we are building, supplied by tasks below
    ...pkgSpecificFlags,

    // copy the build output to /usr/share/kibana/, config and data dirs
    // are excluded with `--exclude` flag above
    `${resolveWithTrailingSlash(fromBuild('.'))}=/usr/share/kibana/`,

    // copy the config directory to /etc/kibana
    `${config.resolveFromRepo('build/os_packages/config/kibana.yml')}=/etc/kibana/kibana.yml`,
    `${resolveWithTrailingSlash(fromBuild('config'))}=/etc/kibana/`,

    // copy the data directory at /var/lib/kibana
    `${resolveWithTrailingSlash(fromBuild('data'))}=/var/lib/kibana/`,

    // copy the logs directory at /var/log/kibana
    `${resolveWithTrailingSlash(fromBuild('logs'))}=/var/log/kibana/`,

    // copy package configurations
    `${resolveWithTrailingSlash(__dirname, 'service_templates/systemd/')}=/`,

    `${resolveWithTrailingSlash(
      __dirname,
      'service_templates/env/kibana'
    )}=/etc/${envFolder}/kibana`,
  ];

  log.debug('calling fpm with args:', args);
  await exec(log, 'fpm', args, {
    cwd: config.resolveFromRepo('.'),
    level: 'info',
  });
}

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';

import { exec } from '../../lib';

export async function runFpm(config, log, build, type, pkgSpecificFlags) {
  const linux = config.getLinuxPlatform();
  const version = config.getBuildVersion();

  const resolveWithTrailingSlash = (...paths) => `${resolve(...paths)}/`;

  const fromBuild = (...paths) => build.resolvePathForPlatform(linux, ...paths);

  const pickLicense = () => {
    if (build.isOss()) {
      return type === 'rpm' ? 'ASL 2.0' : 'ASL-2.0';
    } else {
      return type === 'rpm' ? 'Elastic License' : 'Elastic-License';
    }
  };

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
    build.isOss() ? 'kibana-oss' : 'kibana',
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

    // prevent installing kibana if installing kibana-oss and vice versa
    '--conflicts',
    build.isOss() ? 'kibana' : 'kibana-oss',

    // define install/uninstall scripts
    '--after-install',
    resolve(__dirname, 'package_scripts/post_install.sh'),
    '--before-install',
    resolve(__dirname, 'package_scripts/pre_install.sh'),
    '--before-remove',
    resolve(__dirname, 'package_scripts/pre_remove.sh'),
    '--after-remove',
    resolve(__dirname, 'package_scripts/post_remove.sh'),

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
    `optimizeDir=/usr/share/kibana/optimize`,
    '--template-value',
    `configDir=/etc/kibana`,
    '--template-value',
    `pluginsDir=/usr/share/kibana/plugins`,
    '--template-value',
    `dataDir=/var/lib/kibana`,

    // config and data directories are copied to /usr/share and /var/lib
    // below, so exclude them from the main package source located in
    // /usr/share/kibana/config. PATHS MUST BE RELATIVE, so drop the leading slash
    '--exclude',
    `usr/share/kibana/config`,
    '--exclude',
    `usr/share/kibana/data`,

    // flags specific to the package we are building, supplied by tasks below
    ...pkgSpecificFlags,

    // copy the build output to /usr/share/kibana/, config and data dirs
    // are excluded with `--exclude` flag above
    `${resolveWithTrailingSlash(fromBuild('.'))}=/usr/share/kibana/`,

    // copy the config directory to /etc/kibana
    `${resolveWithTrailingSlash(fromBuild('config'))}=/etc/kibana/`,

    // copy the data directory at /var/lib/kibana
    `${resolveWithTrailingSlash(fromBuild('data'))}=/var/lib/kibana/`,

    // copy the generated pleaserun services for systemd and sysv into /etc/
    `${resolveWithTrailingSlash(__dirname, 'service_templates/sysv/etc')}=/etc/`,
    `${resolveWithTrailingSlash(__dirname, 'service_templates/systemd/etc')}=/etc/`,
  ];

  log.debug('calling fpm with args:', args);
  await exec(log, 'fpm', args, {
    cwd: config.resolveFromRepo('.'),
    level: 'info',
  });
}

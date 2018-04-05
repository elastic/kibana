import fs from 'fs';
import { resolve } from 'path';
import { platform as getPlatform } from 'os';

import { log } from './log';
import { extractTarball } from './tarball';
import { findMostRecentlyChanged } from './find_most_recently_changed';
import { setupUsers, DEFAULT_SUPERUSER_PASS } from './auth';
import {
  RELATIVE_ES_BIN,
  RELATIVE_ES_PLUGIN_BIN,
  RELATIVE_ES_KEYSTORE_BIN,
  ES_GRADLE_WRAPPER_BIN,
  XPACK_ES_REPO_ROOT,
  ES_ARCHIVE_PATTERN,
  XPACK_ES_ARCHIVE_PATTERN,
  XPACK_KIBANA_ROOT,
} from './paths';

async function setupEsWithXpack({ esExtractPath, procs }) {
  await procs.run('buildEsAndXpack', {
    cmd: ES_GRADLE_WRAPPER_BIN,
    args: [':distribution:archives:tar:assemble', ':x-pack-elasticsearch:plugin:assemble'],
    cwd: XPACK_ES_REPO_ROOT,
    wait: true,
  });

  const esTarballPath = findMostRecentlyChanged(ES_ARCHIVE_PATTERN);
  const xpackZipPath = findMostRecentlyChanged(XPACK_ES_ARCHIVE_PATTERN);
  log.debug('es build output %j', esTarballPath);
  log.debug('es x-pack build output %j', esTarballPath);

  const xpackZipFileUrl = getPlatform().startsWith('win')
    ? `file:///${xpackZipPath.replace(/\\/g, '/')}`
    : `file://${xpackZipPath}`;

  await extractTarball(esTarballPath, esExtractPath);

  await procs.run('xpackInstall', {
    cmd: RELATIVE_ES_PLUGIN_BIN,
    args: [ 'install', '--silent', xpackZipFileUrl ],
    cwd: esExtractPath,
    wait: true
  });

  await procs.run('createEsKeystore', {
    cmd: RELATIVE_ES_KEYSTORE_BIN,
    args: [ 'create' ],
    cwd: esExtractPath,
    wait: true,
  });

  await procs.run('setDefaultSuperuserPassword', {
    cmd: RELATIVE_ES_KEYSTORE_BIN,
    stdin: DEFAULT_SUPERUSER_PASS,
    args: [ 'add', 'bootstrap.password', '-x' ],
    cwd: esExtractPath,
    wait: true,
  });
}

export async function runEsWithXpack({ tmpDir, procs, ftrConfig, useSAML = false }) {
  const esExtractPath = resolve(tmpDir, 'es');
  if (!fs.existsSync(esExtractPath)) {
    await setupEsWithXpack({ esExtractPath, procs });
  }

  const samlArgs = [];
  if (useSAML) {
    fs.createReadStream(
      resolve(XPACK_KIBANA_ROOT, 'test/saml_api_integration/fixtures/idp_metadata.xml')
    ).pipe(
      fs.createWriteStream(resolve(esExtractPath, 'config', 'idp_metadata.xml'))
    );

    const kibanaPort = ftrConfig.get('servers.kibana.port');
    samlArgs.push(
      '-E', 'xpack.security.authc.token.enabled=true',
      '-E', 'xpack.security.authc.token.timeout=15s',
      '-E', 'xpack.security.authc.realms.saml1.type=saml',
      '-E', 'xpack.security.authc.realms.saml1.order=0',
      '-E', 'xpack.security.authc.realms.saml1.idp.metadata.path=idp_metadata.xml',
      '-E', 'xpack.security.authc.realms.saml1.idp.entity_id=http://www.elastic.co',
      '-E', `xpack.security.authc.realms.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
      '-E', `xpack.security.authc.realms.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
      '-E', `xpack.security.authc.realms.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/v1/saml`,
      '-E', 'xpack.security.authc.realms.saml1.attributes.principal=urn:oid:0.0.7',
    );
  }

  await procs.run('es', {
    cmd: RELATIVE_ES_BIN,
    args: [
      '-E', `http.port=${ftrConfig.get('servers.elasticsearch.port')}`,
      '-E', `xpack.monitoring.enabled=false`, // disable monitoring in order to drive the UI just with archived data
      '-E', 'xpack.license.self_generated.type=trial',
      '-E', 'xpack.security.enabled=true',
      ...samlArgs,
    ],
    cwd: esExtractPath,
    wait: /^\[.+?\]\[.+?\]\[.+?\] \[.+?\] started$/
  });

  await setupUsers(log, ftrConfig);
}

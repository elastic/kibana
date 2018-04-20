import del from 'del';

import { copyAll, exec } from '../lib';
import { getNodeDownloadInfo } from './nodejs';

export const OptimizeBuildTask = {
  description: 'Running optimizer',

  async run(config, log, build) {
    const tempNodeInstallDir = build.resolvePath('node');
    const platform = config.getPlatformForThisOs();

    // copy extracted node for this platform into the build temporarily
    log.debug('Temporarily installing node.js for', platform.getNodeArch());
    const { extractDir } = getNodeDownloadInfo(config, platform);
    await copyAll(extractDir, tempNodeInstallDir);

    const kibanaScript = platform.isWindows()
      ? '.\\bin\\kibana.bat'
      : './bin/kibana';

    const kibanaArgs = [
      '--env.name=production',
      '--logging.json=false',
      '--plugins.initialize=false',
      '--server.autoListen=false',
    ];

    log.info('Running bin/kibana to trigger the optimizer');

    await exec(log, kibanaScript, kibanaArgs, {
      cwd: build.resolvePath('.'),
      exitAfter: /Optimization .+ complete/
    });

    // clean up temporary node install
    await del(tempNodeInstallDir);
  },
};

import { getInstalledPackages } from '../../npm';
import { LICENSE_OVERRIDES } from '../../license_checker';

import { write } from '../lib';
import { getNodeDownloadInfo } from './nodejs';
import { generateNoticeFromSource, generateBuildNoticeText } from '../../notice';

export const CreateNoticeFileTask = {
  description: 'Generating NOTICE.txt file',

  async run(config, log, build) {
    log.info('Generating notice from source');
    log.indent(4);
    const noticeFromSource = await generateNoticeFromSource({
      productName: build.isOss()
        ? 'Kibana'
        : 'Kibana with X-Pack',
      directory: build.resolvePath(),
      log,
    });
    log.indent(-4);


    log.info('Discovering installed packages');
    const packages = await getInstalledPackages({
      directory: build.resolvePath(),
      dev: false,
      licenseOverrides: LICENSE_OVERRIDES,
    });


    log.info('Generating build notice');
    const { extractDir: nodeDir } = getNodeDownloadInfo(config, config.getLinuxPlatform());
    const notice = await generateBuildNoticeText({
      noticeFromSource,
      packages,
      nodeDir,
    });


    log.info('Writing notice to NOTICE.txt');
    await write(build.resolvePath('NOTICE.txt'), notice);
  },
};

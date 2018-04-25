import { generatePackageNoticeText } from './generate_package_notice_text';
import { generateNodeNoticeText } from './generate_node_notice_text';

/**
 *  When given a list of packages and the directory to the
 *  node distribution that will be shipping with Kibana,
 *  generates the text for NOTICE.txt
 *
 *  @param  {Object} [options={}]
 *  @property {Array<Package>} options.packages List of packages to check, see
 *                                              getInstalledPackages() in ../packages
 *  @property {string} options.nodeDir The directory containing the version of node.js
 *                                     that will ship with Kibana
 *  @return {undefined}
 */
export async function generateBuildNoticeText(options = {}) {
  const { packages, nodeDir, noticeFromSource } = options;

  const packageNotices = await Promise.all(
    packages.map(generatePackageNoticeText)
  );

  return [
    noticeFromSource,
    ...packageNotices,
    generateNodeNoticeText(nodeDir),
  ].join('\n---\n');
}

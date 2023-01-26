/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
 */
export async function generateBuildNoticeText(options = {}) {
  const { packages, nodeDir, nodeVersion, noticeFromSource } = options;

  const packageNotices = await Promise.all(packages.map(generatePackageNoticeText));

  return [noticeFromSource, ...packageNotices, generateNodeNoticeText(nodeDir, nodeVersion)].join(
    '\n---\n'
  );
}

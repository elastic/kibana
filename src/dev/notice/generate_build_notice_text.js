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
  const { packages, nodeDir, nodeVersion, noticeFromSource } = options;

  const packageNotices = await Promise.all(packages.map(generatePackageNoticeText));

  return [noticeFromSource, ...packageNotices, generateNodeNoticeText(nodeDir, nodeVersion)].join(
    '\n---\n'
  );
}

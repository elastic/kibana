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

import { getBundledNotices } from './bundled_notices';

const concatNotices = (notices) => notices.map((notice) => notice.text).join('\n');

export async function generatePackageNoticeText(pkg) {
  const bundledNotices = concatNotices(await getBundledNotices(pkg.directory));

  const intro = `This product bundles ${pkg.name}@${pkg.version}`;
  const license = ` which is available under ${
    pkg.licenses.length > 1
      ? `the\n"${pkg.licenses.join('", ')} licenses.`
      : `a\n"${pkg.licenses[0]}" license.`
  }`;

  const moreInfo = bundledNotices
    ? `\n${bundledNotices}\n`
    : `  For details, see ${pkg.relative}/.`;

  return `${intro}${license}${moreInfo}`;
}

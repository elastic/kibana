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

import { Build } from './build';

export async function buildAll({ styleSheets, log, buildDir }) {
  const bundles = await Promise.all(
    styleSheets.map(async (styleSheet) => {
      if (!styleSheet.localPath.endsWith('.scss')) {
        return;
      }

      const bundle = new Build({
        sourcePath: styleSheet.localPath,
        log,
        theme: styleSheet.theme,
        targetPath: resolve(buildDir, styleSheet.publicPath),
        urlImports: styleSheet.urlImports,
      });
      await bundle.build();

      return bundle;
    })
  );

  return bundles.filter((v) => v);
}

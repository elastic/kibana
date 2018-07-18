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

import webpack from 'webpack';
import supportsColor from 'supports-color';

export async function runWebpack(config) {
  return new Promise((resolve) => {
    webpack(config, (err, stats) => {
      if (err) {
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return;
      }

      const statsColors = process.stdout.isTTY === true ? supportsColor.stdout : false;
      const statsString = stats.toString({
        colors: statsColors
      });

      process.stdout.write(`${statsString}\n`);

      resolve();
    });
  });
}

export function watchWebpack(config) {
  return webpack(config).watch({ aggregateTimeout: 200 }, (err, stats) => {
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
      }
      return;
    }

    const statsColors = process.stdout.isTTY === true ? supportsColor.stdout : false;
    const statsString = stats.toString({
      colors: statsColors
    });

    process.stdout.write(`${statsString}\n`);
  });
}

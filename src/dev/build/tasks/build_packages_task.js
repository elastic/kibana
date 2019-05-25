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

import { buildProductionProjects } from '@kbn/pm';
import { mkdirp } from '../lib';

/**
 * High-level overview of how we enable shared packages in production:
 *
 * tl;dr We copy the packages directly into Kibana's `node_modules` folder,
 * which means they will be available when `require(...)`d.
 *
 * During development we rely on `@kbn/pm` to find all the packages
 * in the Kibana repo and run Yarn in all the right places to create symlinks
 * between these packages. This development setup is described in-depth in the
 * readme in `@kbn/pm`.
 *
 * However, for production we can't use `@kbn/pm` as part of the
 * installation as we don't have an install "tool/step" that can kick it off.
 * We also can't include symlinks in the archives for the different platform, so
 * we can't run `@kbn/pm` in the same way we do for development and
 * just package the result. That means we have two options: either we prepare
 * everything in the built package or we perform the necessary actions when
 * Kibana is starting up in production. We decided on the former: all the Kibana
 * packages are prepared as part of the build process.
 *
 * (All of this is a bit different for Kibana plugins as they _do_ have an
 * install step — the plugin CLI tool. However, Kibana plugins are not allowed
 * to have separate packages yet.)
 *
 * How Kibana packages are prepared:
 *
 * 1. Run the build for each package
 * 2. Copy all the packages into the `build/kibana` folder
 * 3. Replace `link:` dependencies with `file:` dependencies in both Kibana's
 *    `package.json` and in all the dependencies. Yarn will then copy the
 *    sources of these dependencies into `node_modules` instead of setting up
 *    symlinks.
 *
 * In the end after the `install dependencies` build step all Kibana packages
 * will be located within the top-level `node_modules` folder, which means
 * normal module resolution will apply and you can `require(...)` any of these
 * packages when running Kibana in production.
 *
 * ## Known limitations
 *
 * - This process _only_ include packages that used by Kibana or any of its
 *   transitive packages, as it depends on only running `yarn` at the top level.
 *   That means a Kibana plugin can only depend on Kibana packages that are used
 *   in some way by Kibana itself in production, as it won't otherwise be
 *   included in the production build.
 */

export const BuildPackagesTask = {
  description: 'Building distributable versions of packages',
  async run(config, log, build) {
    await mkdirp(config.resolveFromRepo('target'));
    await buildProductionProjects({
      kibanaRoot: config.resolveFromRepo(),
      buildRoot: build.resolvePath(),
      onlyOSS: build.isOss(),
    });
  },
};

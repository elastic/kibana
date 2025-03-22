/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

import dedent from 'dedent';
import chalk from 'chalk';

import { buildDistributables } from './build_distributables';
import { isErrorLogged } from './lib';
import { readCliArgs } from './args';

// ensure the cwd() is always the repo root
process.chdir(resolve(__dirname, '../../../'));

const { showHelp, unknownFlags, log, buildOptions } = readCliArgs(process.argv);

if (unknownFlags.length) {
  const pluralized = unknownFlags.length > 1 ? 'flags' : 'flag';
  log.error(`Unknown ${pluralized}: ${unknownFlags.join(', ')}`);
}

if (showHelp) {
  log.write(
    dedent(chalk`
      {dim usage:} node scripts/build

      build the Kibana distributable

      options:
        --all-platforms                      {dim Produce archives for all platforms, not just this one}
        --deb                                {dim Only build the deb packages}
        --docker-context-use-local-artifact  {dim Use a local artifact when building the Docker context}
        --docker-contexts                    {dim Only build the Docker build contexts}
        --docker-cross-compile               {dim Produce arm64 and amd64 Docker images}
        --docker-images                      {dim Only build the Docker images}
        --docker-namespace                   {dim Specify the registry namespace for image pushing}
        --docker-push                        {dim Enable pushing after building each docker image}
        --docker-tag                         {dim Specify the tag to use for the images, default is version}
        --docker-tag-qualifier               {dim Qualifier to append to the docker tag}
        --epr-registry                       {dim Specify the EPR registry to use for Fleet packages, 'production' or 'snapshot'}
        --no-debug                           {dim Turn off debug logging}
        --release                            {dim Produce a release-ready distributable}
        --rpm                                {dim Only build the rpm packages}
        --serverless                         {dim Only build the serverless packages}
        --skip-archives                      {dim Don't produce tar/zip archives}
        --skip-canvas-shareable-runtime      {dim Don't build the Canvas shareable runtime}
        --skip-cloud-dependencies-download   {dim Don't download cloud dependencies (beats)}
        --skip-cdn-assets                    {dim Don't build CDN assets}
        --skip-docker-cloud                  {dim Don't build the docker cloud image}
        --skip-docker-cloud-fips             {dim Don't build the docker cloud fips image}
        --skip-docker-contexts               {dim Don't produce docker image contexts}
        --skip-docker-fips                   {dim Don't build the docker fips image}
        --skip-docker-serverless             {dim Don't build the docker serverless image}
        --skip-docker-ubi                    {dim Don't build the docker ubi image}
        --skip-docker-wolfi                  {dim Don't build the docker wolfi image}
        --skip-initialize                    {dim Skip environment cleanup and verification}
        --skip-generic-folders               {dim Skip building package, plugins, etc from source}
        --skip-platform-folders              {dim Skip platform specific folder creation and operations}
        --skip-node-download                 {dim Reuse existing downloads of node.js}
        --skip-os-packages                   {dim Don't produce rpm/deb/docker packages}
        --verbose,-v                         {dim Turn on verbose logging}
        --version-qualifier                  {dim Suffix version with a qualifier}
        --with-example-plugins               {dim Pass to include example plugins in the build output}
        --with-test-plugins                  {dim Pass to include test plugins in the build output}
    `) + '\n'
  );
  process.exit(1);
}

buildDistributables(log, buildOptions!).catch((error) => {
  if (!isErrorLogged(error)) {
    log.error('Uncaught error');
    log.error(error);
  }

  process.exit(1);
});

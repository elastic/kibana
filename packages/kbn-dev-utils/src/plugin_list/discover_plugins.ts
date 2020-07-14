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

import Path from 'path';
import Fs from 'fs';

import MarkdownIt from 'markdown-it';
import cheerio from 'cheerio';
import Asciidoc from 'asciidoctor';

import { REPO_ROOT } from '../repo_root';
import { simpleKibanaPlatformPluginDiscovery } from '../simple_kibana_platform_plugin_discovery';

export interface Plugin {
  id: string;
  relativeDir?: string;
  relativeReadmePath?: string;
  readmeSnippet?: string;
  readmeAsciidocLink?: string;
}

export type Plugins = Plugin[];

const getReadmeMdName = (directory: string) =>
  Fs.readdirSync(directory).find((name) => name.toLowerCase() === 'readme.md');

const getReadmeAsciidocName = (directory: string) =>
  Fs.readdirSync(directory).find((name) => name.toLowerCase() === 'readme.asciidoc');

export const discoverPlugins = (pluginsRootDir: string, log: any): Plugins =>
  simpleKibanaPlatformPluginDiscovery([pluginsRootDir], []).map(
    ({ directory, manifest: { id } }): Plugin => {
      const readmeMdName = getReadmeMdName(directory);
      const readmeAsciidocName = getReadmeAsciidocName(directory);

      let relativeReadmePath: string | undefined;
      let readmeSnippet: string | undefined;
      let readmeAsciidocLink: string | undefined;

      if (readmeMdName) {
        const readmePath = Path.resolve(directory, readmeMdName);
        relativeReadmePath = Path.relative(REPO_ROOT, readmePath);
        const md = new MarkdownIt();
        const parsed = md.render(Fs.readFileSync(readmePath, 'utf8'));
        const $ = cheerio.load(parsed);

        const firstParagraph = $('p')[0];
        if (firstParagraph) {
          readmeSnippet = $(firstParagraph).text();
        }
      } else if (readmeAsciidocName) {
        const readmePath = Path.resolve(directory, readmeAsciidocName);

        relativeReadmePath = Path.relative(REPO_ROOT, readmePath);

        const asciidoc = Asciidoc().loadFile(relativeReadmePath);

        log.info(`header: ${asciidoc.getHeader()}`);
        log.info(`id: ${asciidoc.getId()}`);
        log.info(`title: ${asciidoc.getTitle()}`);
        // log.info(`content: ${asciidoc.getContent()}`);

        const parsed = asciidoc.getContent();
        const $ = cheerio.load(parsed);

        const firstParagraph = $('p')[0];
        if (firstParagraph) {
          readmeSnippet = $(firstParagraph).text();
        }

        log.info(`snippet is : ${readmeSnippet}`);

        readmeAsciidocLink = $('h2')[0].attribs.id;

        log.info(`readmeAsciidocLink: ${readmeAsciidocLink}`);
      }

      return {
        id,
        relativeReadmePath,
        relativeDir: relativeReadmePath || Path.relative(REPO_ROOT, directory),
        readmeSnippet,
        readmeAsciidocLink,
      };
    }
  );

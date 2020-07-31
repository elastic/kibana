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

import { REPO_ROOT } from '../repo_root';
import { simpleKibanaPlatformPluginDiscovery } from '../simple_kibana_platform_plugin_discovery';

export interface Plugin {
  id: string;
  relativeDir?: string;
  relativeReadmePath?: string;
  readmeSnippet?: string;
  readmeAsciidocAnchor?: string;
}

export type Plugins = Plugin[];

const getReadmeName = (directory: string) =>
  Fs.readdirSync(directory).find((name) => name.toLowerCase() === 'readme.md');

const getReadmeAsciidocName = (directory: string) =>
  Fs.readdirSync(directory).find((name) => name.toLowerCase() === 'readme.asciidoc');

export const discoverPlugins = (pluginsRootDir: string): Plugins =>
  simpleKibanaPlatformPluginDiscovery([pluginsRootDir], []).map(
    ({ directory, manifest: { id } }): Plugin => {
      const readmeName = getReadmeName(directory);
      const readmeAsciidocName = getReadmeAsciidocName(directory);

      let relativeReadmePath: string | undefined;
      let readmeSnippet: string | undefined;
      let readmeAsciidocAnchor: string | undefined;

      if (readmeAsciidocName) {
        const readmePath = Path.resolve(directory, readmeAsciidocName);
        relativeReadmePath = Path.relative(REPO_ROOT, readmePath);

        const readmeText = Fs.readFileSync(relativeReadmePath).toString();
        // First group is to grab the anchor - \[\[(.*)\]\]
        // Tecond group, (== ), removes the equals from the header
        // Third group could perhaps be done better, but is essentially:
        // If there is a sub heading after the intro, match the intro and stop - (([\s\S]*?)(?=\=\=\=|\[\[)))
        // If there is not a sub heading after the intro, match the intro - ([\s\S]*)
        const matchAnchorAndIntro = /\[\[(.*)\]\]\n(== )(((([\s\S]*?)(?=\=\=\=|\[\[)))|([\s\S]*))/gm;

        const matches = matchAnchorAndIntro.exec(readmeText);
        readmeSnippet = matches && matches.length >= 4 ? matches[3].toString() : undefined;
        readmeAsciidocAnchor = matches && matches.length >= 2 ? matches[1].toString() : undefined;
      } else if (readmeName) {
        const readmePath = Path.resolve(directory, readmeName);
        relativeReadmePath = Path.relative(REPO_ROOT, readmePath);

        const md = new MarkdownIt();
        const parsed = md.render(Fs.readFileSync(readmePath, 'utf8'));
        const $ = cheerio.load(parsed);

        const firstParagraph = $('p')[0];
        if (firstParagraph) {
          readmeSnippet = $(firstParagraph).text();
        }
      }

      return {
        id,
        relativeReadmePath,
        relativeDir: relativeReadmePath || Path.relative(REPO_ROOT, directory),
        readmeSnippet,
        readmeAsciidocAnchor,
      };
    }
  );

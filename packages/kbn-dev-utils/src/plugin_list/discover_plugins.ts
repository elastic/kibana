/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import MarkdownIt from 'markdown-it';
import cheerio from 'cheerio';
import { REPO_ROOT } from '@kbn/utils';
import { simpleKibanaPlatformPluginDiscovery } from '@kbn/plugin-discovery';

import { extractAsciidocInfo } from './extract_asciidoc_info';

export interface Plugin {
  id: string;
  relativeDir: string;
  relativeReadmePath?: string;
  readmeSnippet?: string;
  readmeAsciidocAnchor?: string;
}

export type Plugins = Plugin[];

const getReadmeName = (directory: string) =>
  Fs.readdirSync(directory).find(
    (name) => name.toLowerCase() === 'readme.md' || name.toLowerCase() === 'readme.mdx'
  );

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

        const { firstParagraph, anchor } = extractAsciidocInfo(readmeText);
        readmeSnippet = firstParagraph;
        readmeAsciidocAnchor = anchor;
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

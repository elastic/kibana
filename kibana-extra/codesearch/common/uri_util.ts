/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Uri } from 'monaco-editor';
import pathToRegexp from 'path-to-regexp';
import { Position } from 'vscode-languageserver-types';
import { MAIN } from '../public/components/routes';

const re = pathToRegexp(MAIN);

export interface ParsedUrl {
  schema?: string;
  uri?: string;
}

export interface CompleteParsedUrl extends ParsedUrl {
  repoUri: string;
  revision: string;
  pathType?: string;
  file?: string;
  schema?: string;
  position?: Position;
}

export function parseSchema(url: string): { uri: string; schema?: string } {
  let [schema, uri] = url.toString().split('//');
  if (!uri) {
    uri = schema;
    // @ts-ignore
    schema = undefined;
  }
  if (!uri.startsWith('/')) {
    uri = '/' + uri;
  }
  return { uri, schema };
}

export function parseGoto(goto: string): Position | undefined {
  const regex = /L(\d+)(:\d+)?$/;
  const m = regex.exec(goto);
  if (m) {
    const line = parseInt(m[1], 10);
    let character = 0;
    if (m[2]) {
      character = parseInt(m[2].substring(1), 10);
    }
    return {
      line,
      character,
    };
  }
}

export function parseLspUrl(url: Uri | string): CompleteParsedUrl {
  const { schema, uri } = parseSchema(url.toString());
  const parsed = re.exec(uri);
  if (parsed) {
    const [resource, org, repo, pathType, revision, file, goto] = parsed.slice(1);
    let position;
    if (goto) {
      position = parseGoto(goto);
    }
    return {
      uri: uri.replace(goto, ''),
      repoUri: `${resource}/${org}/${repo}`,
      pathType,
      revision,
      file,
      schema,
      position,
    };
  } else {
    throw new Error('invald url ' + url);
  }
}

const compiled = pathToRegexp.compile(MAIN);

export function toCanonicalUrl(lspUrl: CompleteParsedUrl) {
  const [resource, org, repo] = lspUrl.repoUri!.split('/');
  if (!lspUrl.pathType) {
    lspUrl.pathType = 'blob';
  }
  let goto;
  if (lspUrl.position) {
    goto = `!L${lspUrl.position.line + 1}:${lspUrl.position.character}`;
  }
  const data = { resource, org, repo, path: lspUrl.file, goto, ...lspUrl };
  const uri = decodeURIComponent(compiled(data));
  return lspUrl.schema ? `${lspUrl.schema}/${uri}` : uri;
}

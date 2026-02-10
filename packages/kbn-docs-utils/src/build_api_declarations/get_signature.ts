/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-bitwise */

import type { ToolingLog } from '@kbn/tooling-log';
import { Node, TypeFormatFlags } from 'ts-morph';
import { isNamedNode } from '../tsmorph_utils';
import type { PluginOrPackage, Reference } from '../types';
import { extractImportReferences } from './extract_import_refs';
import { getTypeKind } from './get_type_kind';

/**
 * Special logic for creating the signature based on the type of node. See https://github.com/dsherret/ts-morph/issues/923#issue-795332729
 * for some issues that have been encountered in getting these accurate.
 *
 * By passing node to `getText`, ala `node.getType().getText(node)`, all reference links
 * will be lost. However, if you do _not_ pass node, there are quite a few situations where it returns a reference
 * to itself and has no helpful information.
 *
 * @param node
 * @param plugins
 * @param log
 */
export function getSignature(
  node: Node,
  plugins: PluginOrPackage[],
  log: ToolingLog
): Array<string | Reference> | undefined {
  let signature = '';
  if (Node.isIndexSignatureDeclaration(node)) {
    signature = `[${node.getKeyName()}: ${node.getKeyType().getText()}]:  ${node
      .getReturnType()
      .getText()}`;
  } else if (Node.isFunctionDeclaration(node)) {
    // See https://github.com/dsherret/ts-morph/issues/907#issue-770284331.
    // Unfortunately this has to be manually pieced together, or it comes up as "typeof TheFunction"
    const params = node
      .getParameters()
      .map((p) => `${p.getName()}: ${p.getType().getText()}`)
      .join(', ');
    const returnType = node.getReturnType().getText();
    signature = `(${params}) => ${returnType}`;
  } else if (Node.isInterfaceDeclaration(node) || Node.isClassDeclaration(node)) {
    // Need to tack on manually any type parameters or "extends/implements" section.
    const heritageClause = node
      .getHeritageClauses()
      .map((h) => {
        const heritance = h.getText().indexOf('implements') > -1 ? 'implements' : 'extends';
        return `${heritance} ${h.getTypeNodes().map((n) => n.getType().getText())}`;
      })
      .join(' ');
    signature = `${node.getType().getText()}${heritageClause ? ' ' + heritageClause : ''}`;
  } else {
    // Here, 'node' is explicitly *not* passed in to `getText` otherwise arrow functions won't
    // include reference links. Tests will break if you add it in here, or remove it from above.
    // There is test coverage for all this oddness.
    signature = node
      .getType()
      .getText(
        undefined,
        TypeFormatFlags.UseFullyQualifiedType |
          TypeFormatFlags.InTypeAlias |
          TypeFormatFlags.NoTruncation
      );
  }

  signature = normalizeVerboseSignatures(signature);

  // Don't return the signature if it's the same as the type (string, string)
  if (getTypeKind(node).toString() === signature) return undefined;

  const referenceLinks = extractImportReferences(signature, plugins, log);

  // Don't return the signature if it's a single self referential link.
  if (
    isNamedNode(node) &&
    referenceLinks.length === 1 &&
    typeof referenceLinks[0] === 'object' &&
    (referenceLinks[0] as Reference).text === node.getName()
  ) {
    return undefined;
  }

  // This post-reference-extraction hack catches a *different* verbose `ReactElement` expansion
  // than {@link signatureNormalizations}. After `extractImportReferences` splits the signature
  // into reference link segments, the second generic appears as a separate string chunk using
  // `React.Component` (not `React.JSXElementConstructor`). Both mechanisms are needed until
  // this legacy hack can be replaced by a pre-extraction normalization rule.
  return referenceLinks.map((link) => {
    if (
      link ===
      ', string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)> | null) | (new (props: any) => React.Component<any, any, any>)>'
    ) {
      return '>';
    } else return link;
  });
}

/**
 * Signature normalization rules. Each entry maps a verbose expanded generic
 * default back to the concise form that developers actually write.
 *
 * New entries can be added here as more verbose patterns are discovered.
 */
const signatureNormalizations: Array<{ pattern: RegExp; replacement: string }> = [
  // Order matters: `ReactNode` must be collapsed before `ReactElement` because the
  // `ReactNode` expansion contains a full `ReactElement<any, ...>` that would otherwise
  // be shortened first, preventing the `ReactNode` pattern from matching.

  // `React.ReactNode` expands to a long union of primitive types, `ReactElement`, `Iterable`,
  // `ReactPortal`, `null`, and `undefined`. Collapse it back to the alias.
  // NOTE: This pattern is coupled to `@types/react@18`. If Kibana upgrades to React 19 types
  // (which adds `bigint` and changes the union shape), this regex must be updated to match.
  {
    pattern:
      /string \| number \| boolean \| React\.ReactElement<any, string \| React\.JSXElementConstructor<any>> \| Iterable<React\.ReactNode> \| React\.ReactPortal \| null \| undefined/g,
    replacement: 'React.ReactNode',
  },
  // `ReactElement` has a second generic default (`string | React.JSXElementConstructor<any>`)
  // that expands into verbose output; strip it while keeping the first generic.
  {
    pattern:
      /React(?:\.ReactElement|Element)<([^,>]+),\s*string \|\s*React\.JSXElementConstructor<any>>/g,
    replacement: 'React.ReactElement<$1>',
  },
  // `React.ComponentClass<{}, any> | React.FunctionComponent<{}>` is the expansion of
  // `React.ComponentType<{}>`. Collapse it back.
  {
    pattern: /React\.ComponentClass<\{\}, any> \| React\.FunctionComponent<\{\}>/g,
    replacement: 'React.ComponentType',
  },
  // `React.ComponentType<{}>` uses an empty props default; strip it for readability.
  {
    pattern: /React\.ComponentType<\{\}>/g,
    replacement: 'React.ComponentType',
  },
];

/**
 * Applies all {@link signatureNormalizations} to collapse verbose expanded
 * generic defaults back to their concise aliases.
 */
export function normalizeVerboseSignatures(signature: string): string {
  return signatureNormalizations.reduce(
    (sig, { pattern, replacement }) => sig.replace(pattern, replacement),
    signature
  );
}

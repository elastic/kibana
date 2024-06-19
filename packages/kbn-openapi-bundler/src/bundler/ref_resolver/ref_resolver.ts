/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { extractByJsonPointer } from '../../utils/extract_by_json_pointer';
import { readYamlDocument } from '../../utils/read_yaml_document';
import { ResolvedRef } from './resolved_ref';
import { ResolvedDocument } from './resolved_document';

export interface IRefResolver {
  resolveRef(refDocumentAbsolutePath: string, pointer: string): Promise<ResolvedRef>;
  resolveDocument(documentAbsolutePath: string): Promise<ResolvedDocument>;
}

export class RefResolver implements IRefResolver {
  private documentsCache = new Map<string, ResolvedDocument>();

  async resolveRef(refDocumentAbsolutePath: string, pointer: string): Promise<ResolvedRef> {
    const resolvedRefDocument = await this.resolveDocument(refDocumentAbsolutePath);
    const refNode = extractByJsonPointer(resolvedRefDocument.document, pointer);
    const resolvedRef = {
      absolutePath: refDocumentAbsolutePath,
      pointer,
      document: resolvedRefDocument.document,
      refNode,
    };

    return resolvedRef;
  }

  async resolveDocument(documentAbsolutePath: string): Promise<ResolvedDocument> {
    if (!path.isAbsolute(documentAbsolutePath)) {
      throw new Error(
        `resolveDocument requires absolute document path, provided path "${documentAbsolutePath}" is not absolute`
      );
    }

    const cachedDocument = this.documentsCache.get(documentAbsolutePath);

    if (cachedDocument) {
      return cachedDocument;
    }

    try {
      const document = await readYamlDocument(documentAbsolutePath);
      const resolvedRef = {
        absolutePath: documentAbsolutePath,
        document,
      };

      this.documentsCache.set(documentAbsolutePath, resolvedRef);

      return resolvedRef;
    } catch (e) {
      throw new Error(`Unable to resolve document "${documentAbsolutePath}"`, { cause: e });
    }
  }
}

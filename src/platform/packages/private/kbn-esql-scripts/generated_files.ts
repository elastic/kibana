/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderCommandDefinitions } from './definitions/generate_command_definitions';
import { renderFunctionDefinitions } from './definitions/generate_function_definitions';
import { renderSettings } from './definitions/generate_settings';
import { renderCommandDocs } from './documentation/generate_esql_command_docs';
import { renderFunctionDocs } from './documentation/generate_esql_docs';
import { formatGeneratedFile, type GeneratedFile } from './lib/generated_file';

export const GENERATED_FILE_GROUPS = ['definitions', 'documentation'] as const;
export type GeneratedFileGroup = (typeof GENERATED_FILE_GROUPS)[number];

const RENDERERS: Readonly<Record<GeneratedFileGroup, ReadonlyArray<() => GeneratedFile[]>>> = {
  // Definitions consumed by @kbn/esql-language
  definitions: [renderFunctionDefinitions, renderCommandDefinitions, renderSettings],
  // Inline docs consumed by @kbn/language-documentation
  documentation: [renderCommandDocs, renderFunctionDocs],
};

/** Renders the final (license header + oxfmt formatted) files of the given groups. */
export const renderGeneratedFiles = (
  groups: readonly GeneratedFileGroup[] = GENERATED_FILE_GROUPS
): Promise<GeneratedFile[]> =>
  Promise.all(
    groups
      .flatMap((group) => RENDERERS[group].flatMap((render) => render()))
      .map(formatGeneratedFile)
  );

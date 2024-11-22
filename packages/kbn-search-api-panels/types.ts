/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum Languages {
  JAVA = 'java',
  JAVASCRIPT = 'javascript',
  RUBY = 'ruby',
  GO = 'go',
  DOTNET = 'dotnet',
  PHP = 'php',
  PERL = 'perl',
  PYTHON = 'python',
  RUST = 'rust',
  CURL = 'curl',
}

export interface LanguageDefinitionSnippetArguments {
  url: string;
  apiKey: string;
  indexName?: string;
  cloudId?: string;
  ingestPipeline?: string;
  extraIngestDocumentValues?: Record<string, boolean>;
}

type CodeSnippet = string | ((args: LanguageDefinitionSnippetArguments) => string);
export interface LanguageDefinition {
  name: string;
  id: Languages;
  iconType: string;
  docLink?: string;
  configureClient?: CodeSnippet;
  ingestData?: CodeSnippet;
  ingestDataIndex?: CodeSnippet;
  installClient?: string;
  buildSearchQuery?: CodeSnippet;
  testConnection?: CodeSnippet;
  advancedConfig?: string;
  apiReference?: string;
  basicConfig?: string;
  github?: {
    link: string;
    label: string;
  };
  languageStyling?: string;
}

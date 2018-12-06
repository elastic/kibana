/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@code/lsp-extension';
import { IRange } from 'monaco-editor';

import { Repository, SourceHit } from '../model';
import { RepositoryUri } from './repository';

export interface Document {
  repoUri: RepositoryUri;
  path: string;
  content: string;
  qnames: string[];
  language?: string;
  sha1?: string;
}

// The base interface of indexer requests
export interface IndexRequest {
  repoUri: RepositoryUri;
}

// The request for LspIndexer
export interface LspIndexRequest extends IndexRequest {
  localRepoPath: string; // The repository local file path
  filePath: string; // The file path within the repository
  revision: string; // The revision of the current repository
}

// The request for RepositoryIndexer
export interface RepositoryIndexRequest extends IndexRequest {
  repoUri: RepositoryUri;
}

// The base interface of any kind of search requests.
export interface SearchRequest {
  query: string;
  page: number;
  resultsPerPage?: number;
}

export interface RepositorySearchRequest extends SearchRequest {
  query: string;
}

export interface DocumentSearchRequest extends SearchRequest {
  query: string;
  repoFileters?: string[];
  langFilters?: string[];
}
export interface SymbolSearchRequest extends SearchRequest {
  query: string;
}

// The base interface of any kind of search result.
export interface SearchResult {
  total: number;
  took: number;
}

export interface RepositorySearchResult extends SearchResult {
  repositories: Repository[];
}

export interface SymbolSearchResult extends SearchResult {
  // TODO: we migit need an additional data structure for symbol search result.
  symbols: DetailSymbolInformation[];
}

// All the interfaces for search page

// The item of the search result stats. e.g. Typescript -> 123
export interface SearchResultStatsItem {
  name: string;
  value: number;
}

export interface SearchResultStats {
  total: number; // Total number of results
  from: number; // The beginning of the result range
  to: number; // The end of the result range
  page: number; // The page number
  totalPage: number; // The total number of pages
  repoStats: SearchResultStatsItem[];
  languageStats: SearchResultStatsItem[];
}

export interface CompositeSourceContent {
  content: string;
  lineMapping: string[];
  ranges: IRange[];
}

export interface SearchResultItem {
  uri: string;
  hits: number;
  filePath: string;
  language: string;
  compositeContent: CompositeSourceContent;
}

export interface DocumentSearchResult extends SearchResult {
  query: string;
  from?: number;
  page?: number;
  totalPage?: number;
  stats?: SearchResultStats;
  results?: SearchResultItem[];
  repoAggregations?: any[];
  langAggregations?: any[];
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceRange {
  startLoc: SourceLocation;
  endLoc: SourceLocation;
}

export interface SourceHit {
  range: SourceRange;
  score: number;
  term: string;
}

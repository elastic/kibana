/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MatchedItem } from '../../components/create_index_pattern_wizard/types';

const indexPatternTypeName = i18n.translate(
  'indexPatternManagement.editIndexPattern.createIndex.defaultTypeName',
  { defaultMessage: 'index pattern' }
);

const indexPatternButtonText = i18n.translate(
  'indexPatternManagement.editIndexPattern.createIndex.defaultButtonText',
  { defaultMessage: 'Standard index pattern' }
);

const indexPatternButtonDescription = i18n.translate(
  'indexPatternManagement.editIndexPattern.createIndex.defaultButtonDescription',
  { defaultMessage: 'Perform full aggregations against any data' }
);

export type UrlHandler = (url: string) => void;

export interface IndexPatternCreationOption {
  text: string;
  description: string;
  testSubj: string;
  onClick: () => void;
  isBeta?: boolean;
}

export class IndexPatternCreationConfig {
  public readonly key = 'default';

  protected type?: string;
  protected name: string;
  protected showSystemIndices: boolean;
  protected httpClient: object | null;
  protected isBeta: boolean;

  constructor({
    type = undefined,
    name = indexPatternTypeName,
    showSystemIndices = true,
    httpClient = null,
    isBeta = false,
  }: {
    type?: string;
    name?: string;
    showSystemIndices?: boolean;
    httpClient?: object | null;
    isBeta?: boolean;
  }) {
    this.type = type;
    this.name = name;
    this.showSystemIndices = showSystemIndices;
    this.httpClient = httpClient;
    this.isBeta = isBeta;
  }

  public getIndexPatternCreationOption(urlHandler: UrlHandler): IndexPatternCreationOption {
    return {
      text: indexPatternButtonText,
      description: indexPatternButtonDescription,
      testSubj: `createStandardIndexPatternButton`,
      onClick: () => {
        urlHandler('/create');
      },
    };
  }

  public getIndexPatternType() {
    return this.type;
  }

  public getIndexPatternName() {
    return this.name;
  }

  public getIsBeta() {
    return this.isBeta;
  }

  public getShowSystemIndices() {
    return this.showSystemIndices;
  }

  public getIndexTags(indexName: string) {
    return [];
  }

  public checkIndicesForErrors(indices: MatchedItem[]) {
    return undefined;
  }

  public getIndexPatternMappings() {
    return {};
  }

  public renderPrompt() {
    return null;
  }

  public getFetchForWildcardOptions() {
    return {};
  }
}

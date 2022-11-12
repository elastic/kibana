/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type MDXFile = `${string}.mdx`;
// type StorybookMDXFile = `${string}.stories.mdx`;
// type ElasticMDXFile = `${string}.elastic.mdx`;

// Copied from https://github.com/elastic/docsmobile/blob/main/docsmobile/template/src/interfaces/registryJsonApi.ts
export interface ElasticMetadata {
  id: string;
  slug: string;
  title: string;
  image?: string;
  description?: string;
  tags?: string[];
  related?: string[];
  date?: string;
  layout?: string;
  link?: string;
  linkPath?: string;
}

export interface ArticleIndex {
  [title: string]: ArticleIndex | MDXFile;
}

export type ArticleDescriptorIndex = Record<string, string>;

export const isElasticMetadata = (item: any): item is ElasticMetadata => {
  return item && item.id && item.slug && item.title;
};

const isMDXFile = (item?: MDXFile | ArticleIndex): item is MDXFile => {
  return !!(item && typeof item === 'string');
};

export const getStorybookDescriptorIndex = (index: ArticleIndex): ArticleDescriptorIndex => {
  const data: { [title: string]: string } = {};

  const flatten = (acc: ArticleIndex, path: string) => {
    const keys = Object.keys(acc);

    for (let i = 0; i < keys.length; i++) {
      const item = acc[keys[i]];

      if (!isMDXFile(item)) {
        flatten(item, path + keys[i] + '/');
        continue;
      }

      const storybookFile = item.replace(/\.mdx/, '.stories.mdx');

      const key = storybookFile.split('/').pop();

      if (!key) {
        continue;
      }

      data[key] = path + keys[i];
    }

    return data;
  };

  return flatten(index, '');
};

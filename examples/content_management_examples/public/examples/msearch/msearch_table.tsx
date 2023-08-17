/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TableListView, UserContentCommonSchema } from '@kbn/content-management-table-list-view';
import { useContentClient } from '@kbn/content-management-plugin/public';
import React from 'react';
import { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-browser';

const LISTING_LIMIT = 1000;

export const MSearchTable = () => {
  const contentClient = useContentClient();

  const findItems = async (
    searchQuery: string,
    refs?: {
      references?: SavedObjectsFindOptionsReference[];
      referencesToExclude?: SavedObjectsFindOptionsReference[];
    }
  ) => {
    const { hits, pagination } = await contentClient.mSearch<UserContentCommonSchema>({
      query: {
        text: searchQuery,
        tags: {
          included: refs?.references?.map((ref) => ref.id),
          excluded: refs?.referencesToExclude?.map((ref) => ref.id),
        },
      },
      contentTypes: [
        { contentTypeId: 'map' },
        { contentTypeId: 'dashboard' },
        { contentTypeId: 'visualization' },
        { contentTypeId: 'lens' },
        { contentTypeId: 'search' },
        { contentTypeId: 'index-pattern' },
        { contentTypeId: 'event-annotation-group' },
      ], // TODO: improve types to not require objects here?
    });

    // TODO: needs to have logic of extracting common schema from an unknown mSearch hit: hits.map(hit => cm.convertToCommonSchema(hit))
    // for now we just assume that mSearch hit satisfies UserContentCommonSchema

    return { hits, total: pagination.total };
  };

  return (
    <TableListView
      id="cm-msearch-table"
      headingId="cm-msearch-table-heading"
      findItems={findItems}
      listingLimit={LISTING_LIMIT}
      initialPageSize={50}
      entityName={`ContentItem`}
      entityNamePlural={`ContentItems`}
      title={`MSearch Demo`}
      urlStateEnabled={false}
      emptyPrompt={<>No data found. Try to install some sample data first.</>}
      onClickTitle={(item) => {
        alert(`Clicked item ${item.attributes.title} (${item.id})`);
      }}
    />
  );
};

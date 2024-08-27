/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DataSourceCategory, DataSourceProfileProvider } from '../../profiles';
import { extractIndexPatternFrom } from '../extract_index_pattern_from';

export const createEntitiesDataSourceProfileProvider = (): DataSourceProfileProvider => ({
  profileId: 'entities-data-source-profile',
  profile: {
    // Custom rendering in grid cells
    getCellRenderers: (prev) => () => ({
      ...prev(),

      // This is your summary column
      _source: (props) => {
        return <pre>{JSON.stringify(props.row.flattened, null, 2)}</pre>;
      },

      // Another cell renderer by field name
      other_field: (props) => {
        const val = props.row.flattened.other_field;

        return <marquee>{val}</marquee>;
      },
    }),

    // You can define default columns with this
    getDefaultAppState: () => () => ({
      columns: [{ name: '@timestamp', width: 212 }, { name: 'other_field' }],
    }),

    // Add a new doc viewer tab
    getDocViewer: (prev) => (params) => {
      const prevDocViewer = prev(params);

      return {
        ...prevDocViewer,
        docViewsRegistry: (registry) => {
          registry.add({
            id: 'doc_view_entity_overview',
            title: 'Entity overview',
            order: 0,
            component: (props) => {
              return (
                <>
                  <br />
                  <h1 css={{ fontWeight: 'bold' }}>Entity overview</h1>
                  <br />
                  <pre>{JSON.stringify(props.hit.flattened, null, 2)}</pre>
                </>
              );
            },
          });

          return prevDocViewer.docViewsRegistry(registry);
        },
      };
    },

    // Custom row actions can be added like this
    getRowAdditionalLeadingControls: (prev) => (params) =>
      [
        ...(prev(params) || []),
        {
          id: 'entity_control',
          headerAriaLabel: 'Entity control',
          renderControl: (Control, rowProps) => {
            return (
              <Control
                label="Entity control"
                iconType="gear"
                onClick={() => {
                  alert(`Entity control clicked. Row index: ${rowProps.rowIndex}`);
                }}
              />
            );
          },
        },
      ],
  },
  resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    if (!indexPattern?.startsWith('entities-')) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: { category: DataSourceCategory.Entities },
    };
  },
});

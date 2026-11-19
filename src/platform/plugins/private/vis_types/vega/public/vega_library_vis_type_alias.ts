/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { BasicVisualizationClient, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { VEGA_SAVED_OBJECT_TYPE } from '../common/constants';
import { getVegaVisualizationClient } from './library/vega_library_client';
import { VegaIcon, vegaTitleInWizard } from './vega_icon';

/** Lists Vega library items in the Visualize library next to legacy Vega visualizations. */
export const getVegaLibraryVisTypeAlias = (openLibraryEditor: (id: string) => Promise<void>) =>
  ({
    name: 'vegaLibrary',
    title: vegaTitleInWizard,
    icon: 'visualizeApp',
    description: i18n.translate('visTypeVega.libraryAlias.description', {
      defaultMessage: 'Use the Vega syntax to create new types of visualizations.',
      description: 'Vega and Vega-Lite are product names and should not be translated',
    }),
    stage: 'production',
    disableCreate: true,
    appExtensions: {
      visualizations: {
        docTypes: [VEGA_SAVED_OBJECT_TYPE],
        searchFields: ['title^3', 'description'],
        client: (_contentManagement, http) =>
          getVegaVisualizationClient(http) as BasicVisualizationClient,
        toListItem: ({ id, type, attributes, updatedAt, managed }) => ({
          id,
          title: attributes.title,
          description: attributes.description,
          updatedAt,
          managed,
          icon: VegaIcon,
          typeTitle: vegaTitleInWizard,
          stage: 'production',
          savedObjectType: type,
          editor: { onEdit: openLibraryEditor },
        }),
      },
    },
  } satisfies VisTypeAlias);

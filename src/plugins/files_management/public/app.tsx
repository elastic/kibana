/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { TableListView, UserContentCommonSchema } from '@kbn/content-management-table-list';
import numeral from '@elastic/numeral';
import { useKibana } from './context';
import { i18nTexts } from './i18n_texts';
import { EmptyPrompt } from './components';

type FilesUserContentSchema = UserContentCommonSchema;

export const App: FunctionComponent = () => {
  const {
    services: { filesClient },
  } = useKibana();
  return (
    <TableListView<FilesUserContentSchema>
      emptyPrompt={<EmptyPrompt />}
      entityName={i18nTexts.entityName}
      entityNamePlural={i18nTexts.entityNamePlural}
      findItems={(searchQuery) =>
        filesClient.find({ name: searchQuery || undefined }).then(({ files, total }) => ({
          hits: files.map((file) => ({
            id: file.id,
            updatedAt: file.updated,
            references: [],
            type: 'file',
            attributes: {
              title: file.name,
              size: file.size,
            },
          })),
          total,
        }))
      }
      customTableColumn={{
        name: i18nTexts.size,
        field: 'attributes.size',
        render: (value: any) => value && numeral(value).format('0[.]0 b'),
      }}
      initialFilter=""
      initialPageSize={50}
      listingLimit={1000}
      tableListTitle="Files"
      onClickTitle={() => {}}
      deleteItems={async () => {}}
      asManagementSection
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { TableListView } from '@kbn/content-management-table-list-view';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import numeral from '@elastic/numeral';
import type { FileJSON } from '@kbn/files-plugin/common';

import { useFilesManagementContext } from './context';
import { i18nTexts } from './i18n_texts';
import { EmptyPrompt, DiagnosticsFlyout, FileFlyout } from './components';

type FilesUserContentSchema = Omit<UserContentCommonSchema, 'attributes'> & {
  attributes: {
    title: string;
    description?: string;
    fileKind: string;
  };
};

function naivelyFuzzify(query: string): string {
  return query.includes('*') ? query : `*${query}*`;
}

export const App: FunctionComponent = () => {
  const { filesClient, getFileKindDefinition, getAllFindKindDefinitions } =
    useFilesManagementContext();
  const [showDiagnosticsFlyout, setShowDiagnosticsFlyout] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<undefined | FileJSON>(undefined);

  const kindToExcludeFromSearch = getAllFindKindDefinitions()
    .filter(({ managementUiActions }) => managementUiActions?.list?.enabled === false)
    .map(({ id }) => id);

  return (
    <div data-test-subj="filesManagementApp">
      <TableListView<FilesUserContentSchema>
        title={i18nTexts.tableListTitle}
        description={i18nTexts.tableListDescription}
        titleColumnName={i18nTexts.titleColumnName}
        emptyPrompt={<EmptyPrompt />}
        entityName={i18nTexts.entityName}
        entityNamePlural={i18nTexts.entityNamePlural}
        findItems={(searchQuery) =>
          filesClient
            .find({
              name: searchQuery ? naivelyFuzzify(searchQuery) : undefined,
              kindToExclude: kindToExcludeFromSearch,
            })
            .then(({ files, total }) => ({
              hits: files.map((file) => ({
                id: file.id,
                updatedAt: file.updated,
                references: [],
                type: 'file',
                attributes: {
                  title: file.name + (file.extension ? `.${file.extension}` : ''),
                  ...file,
                },
              })),
              total,
            }))
        }
        customTableColumn={{
          name: i18nTexts.size,
          field: 'attributes.size',
          render: (value: any) => value && numeral(value).format('0[.]0 b'),
          sortable: true,
        }}
        initialFilter=""
        initialPageSize={50}
        listingLimit={1000}
        getOnClickTitle={({ attributes }) =>
          () =>
            setSelectedFile(attributes as unknown as FileJSON)}
        deleteItems={async (items) => {
          await filesClient.bulkDelete({ ids: items.map(({ id }) => id) });
        }}
        withoutPageTemplateWrapper
        additionalRightSideActions={[
          <EuiButtonEmpty onClick={() => setShowDiagnosticsFlyout(true)}>
            {i18nTexts.diagnosticsFlyoutTitle}
          </EuiButtonEmpty>,
        ]}
        rowItemActions={({ attributes }) => {
          const definition = getFileKindDefinition(attributes.fileKind);
          return {
            delete: definition?.managementUiActions?.delete,
          };
        }}
      />
      {showDiagnosticsFlyout && (
        <DiagnosticsFlyout onClose={() => setShowDiagnosticsFlyout(false)} />
      )}
      {Boolean(selectedFile) && (
        <FileFlyout file={selectedFile!} onClose={() => setSelectedFile(undefined)} />
      )}
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { ReactNode, useCallback, useState } from 'react';
import {
  TableListViewTable,
  type TableListViewTableProps,
  type UserContentCommonSchema,
} from '@kbn/content-management-table-list-view-table';

export type TableListViewProps<T extends UserContentCommonSchema = UserContentCommonSchema> = Pick<
  TableListViewTableProps<T>,
  | 'entityName'
  | 'entityNamePlural'
  | 'initialFilter'
  | 'headingId'
  | 'initialPageSize'
  | 'listingLimit'
  | 'urlStateEnabled'
  | 'customTableColumn'
  | 'emptyPrompt'
  | 'findItems'
  | 'createItem'
  | 'editItem'
  | 'deleteItems'
  | 'getDetailViewLink'
  | 'onClickTitle'
  | 'id'
  | 'rowItemActions'
  | 'contentEditor'
  | 'titleColumnName'
  | 'withoutPageTemplateWrapper'
  | 'itemIsEditable'
> & {
  title: string;
  description?: string;
  /**
   * Additional actions (buttons) to be placed in the page header.
   * @note only the first two values will be used.
   */
  additionalRightSideActions?: ReactNode[];
  children?: ReactNode | undefined;
};

export const TableListView = <T extends UserContentCommonSchema>({
  title,
  description,
  entityName,
  entityNamePlural,
  initialFilter,
  headingId,
  initialPageSize,
  listingLimit,
  urlStateEnabled = true,
  customTableColumn,
  emptyPrompt,
  findItems,
  createItem,
  editItem,
  deleteItems,
  getDetailViewLink,
  onClickTitle,
  rowItemActions,
  id: listingId,
  contentEditor,
  children,
  titleColumnName,
  additionalRightSideActions,
  withoutPageTemplateWrapper,
  itemIsEditable,
}: TableListViewProps<T>) => {
  const PageTemplate = withoutPageTemplateWrapper
    ? (React.Fragment as unknown as typeof KibanaPageTemplate)
    : KibanaPageTemplate;

  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();

  const onFetchSuccess = useCallback(() => {
    setHasInitialFetchReturned(true);
  }, []);

  return (
    <PageTemplate panelled data-test-subj={pageDataTestSubject}>
      <KibanaPageTemplate.Header
        pageTitle={<span id={headingId}>{title}</span>}
        description={description}
        rightSideItems={additionalRightSideActions?.slice(0, 2)}
        data-test-subj="top-nav"
      />
      <KibanaPageTemplate.Section aria-labelledby={hasInitialFetchReturned ? headingId : undefined}>
        {/* Any children passed to the component */}
        {children}

        <TableListViewTable
          tableCaption={title}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          initialFilter={initialFilter}
          headingId={headingId}
          initialPageSize={initialPageSize}
          listingLimit={listingLimit}
          urlStateEnabled={urlStateEnabled}
          customTableColumn={customTableColumn}
          emptyPrompt={emptyPrompt}
          findItems={findItems}
          createItem={createItem}
          editItem={editItem}
          deleteItems={deleteItems}
          rowItemActions={rowItemActions}
          getDetailViewLink={getDetailViewLink}
          onClickTitle={onClickTitle}
          id={listingId}
          contentEditor={contentEditor}
          titleColumnName={titleColumnName}
          itemIsEditable={itemIsEditable}
          withoutPageTemplateWrapper={withoutPageTemplateWrapper}
          onFetchSuccess={onFetchSuccess}
          setPageDataTestSubject={setPageDataTestSubject}
        />
      </KibanaPageTemplate.Section>
    </PageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default TableListView;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiCallOut,
  EuiBasicTable,
  EuiSpacer,
  EuiScreenReaderOnly,
  EuiLink,
  EuiIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiText,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState, type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import type { RemoveDataViewProps } from '../edit_index_pattern';
import { MAX_DISPLAYED_RELATIONSHIPS } from '../../constants';

const all = i18n.translate('indexPatternManagement.dataViewTable.spaceCountAll', {
  defaultMessage: 'all',
});

const dataViewColumnName = i18n.translate(
  'indexPatternManagement.dataViewTable.dataViewColumnName',
  {
    defaultMessage: 'Data view',
  }
);

const spacesColumnName = i18n.translate('indexPatternManagement.dataViewTable.spacesColumnName', {
  defaultMessage: 'Spaces',
});

const tableTitle = i18n.translate('indexPatternManagement.dataViewTable.tableTitle', {
  defaultMessage: 'Data views selected for deletion',
});

const relationshipsTableCaption = i18n.translate(
  'indexPatternManagement.dataViewTable.relationshipsTableCaption',
  {
    defaultMessage: 'Kibana objects using this data view',
  }
);

export const spacesWarningText = i18n.translate(
  'indexPatternManagement.dataViewTable.deleteWarning',
  {
    defaultMessage:
      'Deleting a data view permanently removes it from all spaces and prevents all users from using it in any Kibana app such as Discover, Dashboards, or Lens. This action cannot be undone.',
  }
);

export const relationshipCalloutText = i18n.translate(
  'indexPatternManagement.dataViewTable.deleteDanger',
  {
    defaultMessage:
      'At least one of the data views you want to delete is used by another Kibana object. Review the list of affected objects to avoid any disruptions for other Kibana users relying on them. Deleting data views permanently removes them from all spaces and cannot be undone.',
  }
);

interface ModalProps {
  views: RemoveDataViewProps[];
  hasSpaces: boolean;
  relationships: Record<string, SavedObjectRelation[]>;
  reviewedItems: Set<string>;
  setReviewedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const DeleteModalContent: React.FC<ModalProps> = ({
  views,
  hasSpaces,
  relationships,
  reviewedItems,
  setReviewedItems,
}) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const toggleDetails = (id: string) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[id]) {
      delete itemIdToExpandedRowMapValues[id];
    } else {
      const relationsColumns: Array<EuiTableFieldDataColumnType<SavedObjectRelation>> = [
        {
          field: 'meta',
          name: i18n.translate('indexPatternManagement.dataViewTable.relationshipMetaTitle', {
            defaultMessage: 'Name',
          }),
          render: (meta: SavedObjectRelation['meta']) => {
            return meta.inAppUrl ? (
              <EuiLink target="_blank" href={meta.inAppUrl.path}>
                {meta.title}
              </EuiLink>
            ) : (
              meta.title
            );
          },
        },
        {
          field: 'type',
          name: i18n.translate('indexPatternManagement.dataViewTable.relationshipType', {
            defaultMessage: 'Type',
          }),
        },
      ];
      const relationsTable = (
        <div>
          {relationships[id].length === MAX_DISPLAYED_RELATIONSHIPS && (
            <>
              <EuiText size="xs">
                {i18n.translate('indexPatternManagement.dataViewTable.maxRelationshipsShown', {
                  defaultMessage: 'Only the first {maxRelationships} relationships are shown.',
                  values: { maxRelationships: MAX_DISPLAYED_RELATIONSHIPS },
                })}
              </EuiText>
              <EuiSpacer size="xs" />
            </>
          )}
          <EuiBasicTable
            tableCaption={relationshipsTableCaption}
            items={relationships[id]}
            columns={relationsColumns}
          />
        </div>
      );
      itemIdToExpandedRowMapValues[id] = relationsTable;
      setReviewedItems(new Set(reviewedItems).add(id));
    }

    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns: Array<EuiTableFieldDataColumnType<RemoveDataViewProps>> = [
    {
      field: 'name',
      name: dataViewColumnName,
      sortable: true,
    },
    ...(hasSpaces
      ? [
          {
            field: 'namespaces',
            name: spacesColumnName,
            sortable: true,
            width: '100px',
            align: 'right',
            render: (namespaces: string[]) =>
              namespaces.indexOf('*') !== -1 ? all : namespaces.length,
          } as EuiTableFieldDataColumnType<RemoveDataViewProps>,
        ]
      : []),
    {
      field: 'id',
      align: 'right',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('indexPatternManagement.dataViewTable.viewRelationships', {
              defaultMessage: 'View relationships',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: (id: RemoveDataViewProps['id']) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <>
            {relationships[id]?.length ? (
              <EuiButtonEmpty
                css={{ width: 'auto' }}
                onClick={() => toggleDetails(id)}
                aria-label={itemIdToExpandedRowMapValues[id] ? 'Collapse' : 'Expand'}
                color="danger"
                size={isMobile ? 's' : 'm'}
              >
                <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="s">
                  {!isMobile && (
                    <>
                      <EuiText>
                        {i18n.translate('indexPatternManagement.dataViewTable.review', {
                          defaultMessage: 'Review',
                        })}
                      </EuiText>
                      <EuiSpacer size="xs" />
                    </>
                  )}
                  <EuiIcon type={itemIdToExpandedRowMapValues[id] ? 'arrowDown' : 'arrowRight'} />
                </EuiFlexGroup>
              </EuiButtonEmpty>
            ) : (
              <></>
            )}
          </>
        );
      },
    },
  ];

  views = views.map((view, index) => ({
    ...view,
    name: view.getName(),
    relationships: relationships[index],
  }));

  const showRelationshipsCallout = Object.keys(relationships).some(
    (key) => relationships[key].length > 0
  );

  return (
    <div>
      {showRelationshipsCallout ? (
        <>
          <EuiCallOut
            announceOnMount={false}
            color="danger"
            iconType="warning"
            title={relationshipCalloutText}
          />
        </>
      ) : (
        <EuiCallOut
          announceOnMount={false}
          color="warning"
          iconType="warning"
          title={spacesWarningText}
        />
      )}
      <EuiSpacer size="m" />
      <div>
        <FormattedMessage
          id="indexPatternManagement.dataViewTable.deleteConfirmSummary"
          defaultMessage="Successfully deleted {count, number} {count, plural,
          one {data view}
          other {data views}
}."
          values={{ count: views.length }}
        />
      </div>
      <EuiSpacer size="m" />
      <EuiBasicTable
        tableCaption={tableTitle}
        items={views}
        itemId="id"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        columns={columns}
      />
    </div>
  );
};

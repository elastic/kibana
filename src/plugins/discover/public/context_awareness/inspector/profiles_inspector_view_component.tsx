/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import type { DataTableRecordWithContext } from '../record_has_context';
import type { ProfilesAdapter } from './profiles_adapter';

const ProfilesInspectorViewComponent = ({
  profilesAdapter,
}: {
  profilesAdapter: ProfilesAdapter;
}) => {
  const [{ rootContext, dataSourceContext, documentContexts }, setContexts] = useState(
    profilesAdapter.getContexts()
  );

  useEffect(() => {
    const onChange = () => {
      setContexts(profilesAdapter.getContexts());
    };

    profilesAdapter.on('change', onChange);

    return () => {
      profilesAdapter.off('change', onChange);
    };
  }, [profilesAdapter]);

  return (
    <div css={{ overflowY: 'auto' }}>
      <ProfileSection title="Root profile">
        <EuiDescriptionList
          listItems={[
            {
              title: 'Profile ID',
              description: defaultIfEmpty(rootContext?.profileId),
            },
            {
              title: 'Solution type',
              description: defaultIfEmpty(rootContext?.solutionType),
            },
          ]}
        />
      </ProfileSection>
      <EuiSpacer size="m" />
      <ProfileSection title="Data source profile">
        <EuiDescriptionList
          listItems={[
            {
              title: 'Profile ID',
              description: defaultIfEmpty(dataSourceContext?.profileId),
            },
            {
              title: 'Category',
              description: defaultIfEmpty(dataSourceContext?.category),
            },
          ]}
        />
      </ProfileSection>
      <EuiSpacer size="m" />
      <ProfileSection title="Document profiles">
        <DocumentProfilesDisplay documentContexts={documentContexts} />
      </ProfileSection>
    </div>
  );
};

const ProfileSection: FC<{ title: string }> = ({ title, children }) => (
  <EuiPanel hasBorder hasShadow={false}>
    <EuiTitle size="s">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    {children}
  </EuiPanel>
);

const DocumentProfilesDisplay = ({
  documentContexts,
}: {
  documentContexts?: Record<string, DataTableRecordWithContext[]>;
}) => {
  const [expandedRowMap, setExpandedRowMap] = useState<Record<string, ReactNode>>({});
  const sortedDocumentProfiles = useMemo(() => {
    return Object.keys(documentContexts ?? {})
      .sort()
      .map((profileId) => {
        const records = documentContexts?.[profileId] ?? [];

        return {
          profileId,
          records,
          recordCount: records.length,
        };
      });
  }, [documentContexts]);

  return (
    <EuiBasicTable
      tableCaption="Document profiles"
      items={sortedDocumentProfiles}
      itemId="profileId"
      rowHeader="profileId"
      columns={[
        {
          field: 'profileId',
          name: 'Profile ID',
        },
        {
          field: 'recordCount',
          name: 'Record count',
        },
        {
          align: 'right',
          width: '40px',
          isExpander: true,
          name: (
            <EuiScreenReaderOnly>
              <span>Expand row</span>
            </EuiScreenReaderOnly>
          ),
          mobileOptions: { header: false },
          render: ({
            profileId,
            records,
          }: {
            profileId: string;
            records: DataTableRecordWithContext[];
          }) => (
            <EuiButtonIcon
              onClick={() => {
                if (expandedRowMap[profileId]) {
                  const { [profileId]: _, ...updatedRowMap } = expandedRowMap;

                  setExpandedRowMap(updatedRowMap);
                } else {
                  setExpandedRowMap({
                    ...expandedRowMap,
                    [profileId]: <DocumentProfileDisplay profileId={profileId} records={records} />,
                  });
                }
              }}
              aria-label={expandedRowMap[profileId] ? 'Collapse' : 'Expand'}
              iconType={expandedRowMap[profileId] ? 'arrowDown' : 'arrowRight'}
            />
          ),
        },
      ]}
      itemIdToExpandedRowMap={expandedRowMap}
    />
  );
};

const DocumentProfileDisplay = ({
  profileId,
  records,
}: {
  profileId: string;
  records: DataTableRecordWithContext[];
}) => {
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const pageRecords = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    return records.slice(startIndex, Math.min(startIndex + pageSize, records.length));
  }, [pageIndex, pageSize, records]);

  return (
    <EuiBasicTable
      tableCaption={`Records with profile ID ${profileId}`}
      items={pageRecords}
      rowHeader="raw._id"
      columns={[
        {
          field: 'raw._id',
          name: 'Record ID',
        },
        {
          field: 'context.type',
          name: 'Type',
        },
      ]}
      pagination={{
        pageIndex,
        pageSize,
        totalItemCount: records.length,
        pageSizeOptions: [10, 25, 50],
      }}
      onChange={({ page }: CriteriaWithPagination<DataTableRecordWithContext>) => {
        setPageIndex(page.index);
        setPageSize(page.size);
      }}
      css={{
        table: {
          border: euiTheme.border.thin,
        },
      }}
    />
  );
};

const defaultIfEmpty = (value: string | undefined) => value ?? '-';

// eslint-disable-next-line import/no-default-export
export default ProfilesInspectorViewComponent;

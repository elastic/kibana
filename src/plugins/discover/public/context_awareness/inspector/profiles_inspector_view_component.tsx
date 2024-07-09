/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiInMemoryTable,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { DataTableRecordWithContext } from '../record_has_context';
import type { ProfilesAdapter } from './profiles_adapter';

const ProfilesInspectorViewComponent = ({
  profilesAdapter,
}: {
  profilesAdapter: ProfilesAdapter;
}) => {
  const { rootContext, dataSourceContext, documentContexts } = useObservable(
    profilesAdapter.getContexts$(),
    profilesAdapter.getContexts()
  );

  return (
    <div css={{ overflowY: 'auto' }}>
      <ProfileSection
        title={i18n.translate('discover.inspector.profilesInspectorView.rootProfileTitle', {
          defaultMessage: 'Root profile',
        })}
      >
        <EuiDescriptionList
          listItems={[
            {
              title: i18n.translate('discover.inspector.profilesInspectorView.rootProfileIdTitle', {
                defaultMessage: 'Profile ID',
              }),
              description: defaultIfEmpty(rootContext?.profileId),
            },
            {
              title: i18n.translate(
                'discover.inspector.profilesInspectorView.rootSolutionTypeTitle',
                {
                  defaultMessage: 'Solution type',
                }
              ),
              description: defaultIfEmpty(rootContext?.solutionType),
            },
          ]}
        />
      </ProfileSection>
      <EuiSpacer size="m" />
      <ProfileSection
        title={i18n.translate('discover.inspector.profilesInspectorView.dataSourceProfileTitle', {
          defaultMessage: 'Data source profile',
        })}
      >
        <EuiDescriptionList
          listItems={[
            {
              title: i18n.translate(
                'discover.inspector.profilesInspectorView.dataSourceProfileIdTitle',
                {
                  defaultMessage: 'Profile ID',
                }
              ),
              description: defaultIfEmpty(dataSourceContext?.profileId),
            },
            {
              title: i18n.translate(
                'discover.inspector.profilesInspectorView.dataSourceCategoryTitle',
                {
                  defaultMessage: 'Category',
                }
              ),
              description: defaultIfEmpty(dataSourceContext?.category),
            },
          ]}
        />
      </ProfileSection>
      <EuiSpacer size="m" />
      <ProfileSection
        title={i18n.translate('discover.inspector.profilesInspectorView.documentProfilesTitle', {
          defaultMessage: 'Document profiles',
        })}
      >
        <DocumentProfilesDisplay
          profilesAdapter={profilesAdapter}
          documentContexts={documentContexts}
        />
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
  profilesAdapter,
  documentContexts,
}: {
  profilesAdapter: ProfilesAdapter;
  documentContexts?: Record<string, DataTableRecordWithContext[]>;
}) => {
  const [expandedProfileId, setExpandedProfileId] = useState<string | undefined>(undefined);
  const sortedDocumentProfiles = useMemo(() => {
    return Object.keys(documentContexts ?? {})
      .sort()
      .map((profileId) => ({
        profileId,
        recordCount: documentContexts?.[profileId]?.length ?? 0,
      }));
  }, [documentContexts]);

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate(
        'discover.inspector.profilesInspectorView.documentProfilesTableCaption',
        {
          defaultMessage: 'Document profiles',
        }
      )}
      items={sortedDocumentProfiles}
      itemId="profileId"
      columns={[
        {
          field: 'profileId',
          name: i18n.translate(
            'discover.inspector.profilesInspectorView.documentProfilesProfileIdColumn',
            {
              defaultMessage: 'Profile ID',
            }
          ),
        },
        {
          field: 'recordCount',
          name: i18n.translate(
            'discover.inspector.profilesInspectorView.documentProfilesRecordCountColumn',
            {
              defaultMessage: 'Record count',
            }
          ),
        },
        getExpandColumn<{ profileId: string }>({
          isExpanded: ({ profileId }) => expandedProfileId === profileId,
          onClick: ({ profileId }) => {
            setExpandedProfileId(expandedProfileId === profileId ? undefined : profileId);
          },
        }),
      ]}
      itemIdToExpandedRowMap={
        expandedProfileId
          ? {
              [expandedProfileId]: (
                <DocumentProfileDisplay
                  profilesAdapter={profilesAdapter}
                  profileId={expandedProfileId}
                  records={documentContexts?.[expandedProfileId] ?? []}
                />
              ),
            }
          : undefined
      }
    />
  );
};

const DocumentProfileDisplay = ({
  profilesAdapter,
  profileId,
  records,
}: {
  profilesAdapter: ProfilesAdapter;
  profileId: string;
  records: DataTableRecordWithContext[];
}) => {
  const { euiTheme } = useEuiTheme();
  const [expandedRecord, setExpandedRecord] = useState<DataTableRecordWithContext | undefined>(
    undefined
  );

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate(
        'discover.inspector.profilesInspectorView.documentProfileTableCaption',
        {
          defaultMessage: 'Records with document profile ID {profileId}',
          values: { profileId },
        }
      )}
      items={records}
      itemId="id"
      pagination={true}
      columns={[
        {
          name: i18n.translate('discover.inspector.profilesInspectorView.documentProfileIdColumn', {
            defaultMessage: 'Record ID',
          }),
          render: (record: DataTableRecordWithContext) => record.raw._id ?? record.id,
        },
        {
          field: 'context.type',
          name: i18n.translate(
            'discover.inspector.profilesInspectorView.documentProfileTypeColumn',
            {
              defaultMessage: 'Type',
            }
          ),
        },
        {
          width: '40px',
          name: (
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate(
                  'discover.inspector.profilesInspectorView.documentProfileActionsColumn',
                  {
                    defaultMessage: 'Actions',
                  }
                )}
              </span>
            </EuiScreenReaderOnly>
          ),
          actions: [
            {
              name: i18n.translate(
                'discover.inspector.profilesInspectorView.documentProfileDetailsAction',
                {
                  defaultMessage: 'View details',
                }
              ),
              description: i18n.translate(
                'discover.inspector.profilesInspectorView.documentProfileDetailsActionDescription',
                {
                  defaultMessage: 'View record details',
                }
              ),
              icon: 'inspect',
              type: 'icon',
              onClick: (record) => {
                profilesAdapter.viewRecordDetails(record);
              },
            },
          ],
        },
        getExpandColumn<DataTableRecordWithContext>({
          isExpanded: (record) => expandedRecord?.id === record.id,
          onClick: (record) => {
            setExpandedRecord(expandedRecord?.id === record.id ? undefined : record);
          },
        }),
      ]}
      itemIdToExpandedRowMap={
        expandedRecord
          ? { [expandedRecord.id]: <DocumentJsonDisplay record={expandedRecord} /> }
          : undefined
      }
      css={{
        table: {
          border: euiTheme.border.thin,
        },
      }}
    />
  );
};

const DocumentJsonDisplay = ({ record }: { record: DataTableRecordWithContext }) => {
  return (
    <EuiCodeBlock
      language="json"
      overflowHeight={300}
      isVirtualized
      isCopyable
      transparentBackground
      paddingSize="none"
      css={{ width: '100%' }}
    >
      {JSON.stringify(record.raw, null, 2)}
    </EuiCodeBlock>
  );
};

const getExpandColumn = <T extends object>({
  isExpanded,
  onClick,
}: {
  isExpanded: (value: T) => boolean;
  onClick: (value: T) => void;
}): EuiBasicTableColumn<T> => ({
  align: 'right',
  width: '40px',
  isExpander: true,
  mobileOptions: { header: false },
  name: (
    <EuiScreenReaderOnly>
      <span>
        {i18n.translate('discover.inspector.profilesInspectorView.expandColumn', {
          defaultMessage: 'Expand row',
        })}
      </span>
    </EuiScreenReaderOnly>
  ),
  render: (value: T) => {
    const isRowExpanded = isExpanded(value);

    return (
      <EuiButtonIcon
        onClick={() => onClick(value)}
        aria-label={
          isRowExpanded
            ? i18n.translate('discover.inspector.profilesInspectorView.collapseRowAriaLabel', {
                defaultMessage: 'Collapse',
              })
            : i18n.translate('discover.inspector.profilesInspectorView.expandRowAriaLabel', {
                defaultMessage: 'Expand',
              })
        }
        iconType={isRowExpanded ? 'arrowDown' : 'arrowRight'}
      />
    );
  },
});

const defaultIfEmpty = (value: string | undefined) => value ?? '-';

// eslint-disable-next-line import/no-default-export
export default ProfilesInspectorViewComponent;

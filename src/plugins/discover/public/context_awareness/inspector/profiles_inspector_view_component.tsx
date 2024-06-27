/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiInMemoryTable,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC, useEffect, useMemo, useState } from 'react';
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
      rowHeader="profileId"
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
        {
          align: 'right',
          width: '40px',
          isExpander: true,
          name: (
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate(
                  'discover.inspector.profilesInspectorView.documentProfilesExpandColumn',
                  {
                    defaultMessage: 'Expand row',
                  }
                )}
              </span>
            </EuiScreenReaderOnly>
          ),
          mobileOptions: { header: false },
          render: ({ profileId }: { profileId: string }) => (
            <EuiButtonIcon
              onClick={() => {
                setExpandedProfileId(expandedProfileId === profileId ? undefined : profileId);
              }}
              aria-label={
                expandedProfileId === profileId
                  ? i18n.translate(
                      'discover.inspector.profilesInspectorView.documentProfilesCollapseRowAriaLabel',
                      {
                        defaultMessage: 'Collapse',
                      }
                    )
                  : i18n.translate(
                      'discover.inspector.profilesInspectorView.documentProfilesExpandRowAriaLabel',
                      {
                        defaultMessage: 'Expand',
                      }
                    )
              }
              iconType={expandedProfileId === profileId ? 'arrowDown' : 'arrowRight'}
            />
          ),
        },
      ]}
      itemIdToExpandedRowMap={
        expandedProfileId
          ? {
              [expandedProfileId]: (
                <DocumentProfileDisplay
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
  profileId,
  records,
}: {
  profileId: string;
  records: DataTableRecordWithContext[];
}) => {
  const { euiTheme } = useEuiTheme();

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
      rowHeader="raw._id"
      columns={[
        {
          field: 'raw._id',
          name: i18n.translate('discover.inspector.profilesInspectorView.documentProfileIdColumn', {
            defaultMessage: 'Record ID',
          }),
          render: (id: string, record) => id ?? record.id,
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
      ]}
      pagination={true}
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

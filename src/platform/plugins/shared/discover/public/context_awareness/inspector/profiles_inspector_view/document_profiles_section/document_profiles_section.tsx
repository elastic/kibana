/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ProfileSection } from '../profile_section';
import { DocumentProfileTable } from './document_profile_table';
import { getExpandAction } from './get_expand_action';
import type { Contexts } from '../../../hooks/use_active_contexts';

export function DocumentProfilesSection({
  documentContexts,
  onViewRecordDetails,
}: {
  documentContexts: Contexts['documentContexts'];
  onViewRecordDetails: (record: DataTableRecord) => void;
}) {
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
    <ProfileSection
      title={i18n.translate('discover.inspector.profilesInspectorView.documentProfilesTitle', {
        defaultMessage: 'Document profiles',
      })}
    >
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
          {
            name: i18n.translate(
              'discover.inspector.profilesInspectorView.documentProfilesRecordExpandColumn',
              {
                defaultMessage: 'Expand profile',
              }
            ),
            align: 'right',
            actions: [
              getExpandAction<(typeof sortedDocumentProfiles)[number]>({
                name: i18n.translate(
                  'discover.inspector.profilesInspectorView.documentProfilesRecordExpandColumn',
                  {
                    defaultMessage: 'Expand profile',
                  }
                ),
                description: i18n.translate(
                  'discover.inspector.profilesInspectorView.documentProfilesRecordExpandColumnDescription',
                  {
                    defaultMessage: 'Expand to view records for this profile',
                  }
                ),
                'data-test-subj': 'documentsProfilesSectionExpandAction',
                isExpanded: ({ profileId }) => expandedProfileId === profileId,
                onClick: (value) => setExpandedProfileId(value?.profileId),
              }),
            ],
          },
        ]}
        itemIdToExpandedRowMap={
          expandedProfileId
            ? {
                [expandedProfileId]: (
                  <DocumentProfileTable
                    onViewRecordDetails={(record) => onViewRecordDetails(record)}
                    profileId={expandedProfileId}
                    records={documentContexts?.[expandedProfileId] ?? []}
                  />
                ),
              }
            : undefined
        }
      />
    </ProfileSection>
  );
}

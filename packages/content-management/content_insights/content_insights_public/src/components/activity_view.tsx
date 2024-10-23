/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  UserAvatarTip,
  useUserProfile,
  NoUpdaterTip,
  NoCreatorTip,
  ManagedAvatarTip,
} from '@kbn/content-management-user-profiles';
import { getUserDisplayName } from '@kbn/user-profile-components';

import { Item } from '../types';

export interface ActivityViewProps {
  item: Pick<Partial<Item>, 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'managed'>;
}

export const ActivityView = ({ item }: ActivityViewProps) => {
  const showLastUpdated = Boolean(item.updatedAt && item.updatedAt !== item.createdAt);

  const UnknownUserLabel = (
    <FormattedMessage
      id="contentManagement.contentEditor.activity.unkownUserLabel"
      defaultMessage="Unknown"
    />
  );

  const ManagedUserLabel = (
    <>
      <ManagedAvatarTip />{' '}
      <FormattedMessage
        id="contentManagement.contentEditor.activity.managedUserLabel"
        defaultMessage="System"
      />
    </>
  );

  return (
    <EuiFlexGroup gutterSize={'s'} data-test-subj={'activityView'}>
      <EuiFlexItem grow={1} css={{ flexBasis: '50%', minWidth: 0 }}>
        <ActivityCard
          what={i18n.translate('contentManagement.contentEditor.activity.createdByLabelText', {
            defaultMessage: 'Created by',
          })}
          who={
            item.createdBy ? (
              <UserLabel uid={item.createdBy} />
            ) : item.managed ? (
              <>{ManagedUserLabel}</>
            ) : (
              <>
                {UnknownUserLabel}
                <NoCreatorTip />
              </>
            )
          }
          when={item.createdAt}
          data-test-subj={'createdByCard'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1} css={{ flexBasis: '50%', minWidth: 0 }}>
        {showLastUpdated && (
          <ActivityCard
            what={i18n.translate(
              'contentManagement.contentEditor.activity.lastUpdatedByLabelText',
              { defaultMessage: 'Last updated by' }
            )}
            who={
              item.updatedBy ? (
                <UserLabel uid={item.updatedBy} />
              ) : item.managed ? (
                <>{ManagedUserLabel}</>
              ) : (
                <>
                  {UnknownUserLabel}
                  <NoUpdaterTip />
                </>
              )
            }
            when={item.updatedAt}
            data-test-subj={'updatedByCard'}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const dateFormatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  dateStyle: 'long',
  timeStyle: 'short',
});

const ActivityCard = ({
  what,
  when,
  who,
  'data-test-subj': dataTestSubj,
}: {
  what: string;
  who: React.ReactNode;
  when?: string;
  'data-test-subj'?: string;
}) => {
  return (
    <EuiPanel hasBorder paddingSize={'s'} data-test-subj={dataTestSubj}>
      <EuiText size={'s'}>
        <b>{what}</b>
      </EuiText>
      <EuiSpacer size={'xs'} />
      <EuiText size={'s'} className={'eui-textTruncate'}>
        {who}
      </EuiText>
      {when && (
        <>
          <EuiSpacer size={'xs'} />
          <EuiText title={when} color={'subdued'} size={'s'}>
            <FormattedMessage
              id="contentManagement.contentEditor.activity.lastUpdatedByDateTime"
              defaultMessage="on {dateTime}"
              values={{
                dateTime: dateFormatter.format(new Date(when)),
              }}
            />
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

const UserLabel = ({ uid }: { uid: string }) => {
  const userQuery = useUserProfile(uid);

  if (!userQuery.data) return null;

  return (
    <>
      <UserAvatarTip uid={uid} /> {getUserDisplayName(userQuery.data.user)}
    </>
  );
};

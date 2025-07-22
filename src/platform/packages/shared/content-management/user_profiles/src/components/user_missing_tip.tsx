/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIconTip, IconType } from '@elastic/eui';
import React from 'react';

const fallbackEntityNamePlural = i18n.translate(
  'contentManagement.userProfiles.fallbackEntityNamePlural',
  { defaultMessage: 'objects' }
);

export const NoCreatorTip = (props: {
  iconType?: IconType;
  includeVersionTip?: boolean;
  entityNamePlural?: string;
}) => (
  <NoUsersTip
    content={
      props.includeVersionTip ? (
        <FormattedMessage
          id="contentManagement.userProfiles.noCreatorTipWithVersion"
          defaultMessage="Created by is set when {entityNamePlural} are created by users (not by API) starting from version {version}"
          values={{
            version: '8.14',
            entityNamePlural: props.entityNamePlural ?? fallbackEntityNamePlural,
          }}
        />
      ) : (
        <FormattedMessage
          id="contentManagement.userProfiles.noCreatorTip"
          defaultMessage="Created by is set when {entityNamePlural} are created by users (not by API)"
          values={{ entityNamePlural: props.entityNamePlural ?? fallbackEntityNamePlural }}
        />
      )
    }
    {...props}
  />
);

export const NoUpdaterTip = (props: {
  iconType?: string;
  includeVersionTip?: boolean;
  entityNamePlural?: string;
}) => (
  <NoUsersTip
    content={
      props.includeVersionTip ? (
        <FormattedMessage
          id="contentManagement.userProfiles.noUpdaterTipWithVersion"
          defaultMessage="Updated by is set when {entityNamePlural} are updated by users (not by API) starting from version {version}"
          values={{
            version: '8.15',
            entityNamePlural: props.entityNamePlural ?? fallbackEntityNamePlural,
          }}
        />
      ) : (
        <FormattedMessage
          id="contentManagement.userProfiles.noUpdaterTip"
          defaultMessage="Updated by is set when {entityNamePlural} are created by users (not by API)"
          values={{ entityNamePlural: props.entityNamePlural ?? fallbackEntityNamePlural }}
        />
      )
    }
    {...props}
  />
);

const NoUsersTip = ({
  iconType: type = 'question',
  ...props
}: {
  content: React.ReactNode;
  iconType?: IconType;
}) => (
  <EuiIconTip
    aria-label="Additional information"
    position="top"
    color="inherit"
    iconProps={{ style: { verticalAlign: 'text-bottom', marginLeft: 2 } }}
    css={{ textWrap: 'balance' }}
    type={type}
    {...props}
  />
);

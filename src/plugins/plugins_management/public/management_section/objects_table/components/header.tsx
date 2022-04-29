/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonEmpty, EuiIcon, EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const Header = ({ onRefresh }: { onRefresh: () => void }) => (
  <EuiPageHeader
    pageTitle={
      <>
        <EuiIcon type="package" size="xl" />
        <FormattedMessage
          id="pluginsManagement.objectsTable.header.savedObjectsTitle"
          defaultMessage="Plugins Management"
        />
      </>
    }
    description={
      <FormattedMessage
        id="pluginsManagement.objectsTable.howToDeleteSavedObjectsDescription"
        defaultMessage="Manage and upgrade Kibana plugins."
      />
    }
    bottomBorder
    rightSideItems={[
      <EuiButtonEmpty size="s" iconType="refresh" onClick={onRefresh}>
        <FormattedMessage
          id="pluginsManagement.objectsTable.header.refreshButtonLabel"
          defaultMessage="Refresh"
        />
      </EuiButtonEmpty>,
    ]}
  />
);

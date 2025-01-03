/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiFormRow } from '@elastic/eui';
import {
  DashboardDrilldownOptions,
  DashboardDrilldownOptionsComponent,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';
import {
  UrlDrilldownOptions,
  UrlDrilldownOptionsComponent,
  DEFAULT_URL_DRILLDOWN_OPTIONS,
} from '@kbn/ui-actions-enhanced-plugin/public';

import {
  LinkType,
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  LinkOptions,
} from '../../../common/content_management';
import { LinksStrings } from '../links_strings';
import { UnorderedLink } from '../../editor/open_link_editor_flyout';

export const LinkOptionsComponent = ({
  link,
  setLinkOptions,
  selectedLinkType,
}: {
  selectedLinkType: LinkType;
  link?: UnorderedLink;
  setLinkOptions: (options: LinkOptions) => void;
}) => {
  const [dashboardLinkOptions, setDashboardLinkOptions] = useState<DashboardDrilldownOptions>({
    ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
    ...(link && link.type === DASHBOARD_LINK_TYPE ? link.options : {}),
  });
  const [externalLinkOptions, setExternalLinkOptions] = useState<UrlDrilldownOptions>({
    ...DEFAULT_URL_DRILLDOWN_OPTIONS,
    ...(link && link.type === EXTERNAL_LINK_TYPE ? link.options : {}),
  });

  return (
    <EuiFormRow label={LinksStrings.editor.linkEditor.getLinkOptionsLabel()}>
      {selectedLinkType === DASHBOARD_LINK_TYPE ? (
        <DashboardDrilldownOptionsComponent
          options={dashboardLinkOptions}
          onOptionChange={(change) => {
            setDashboardLinkOptions({ ...dashboardLinkOptions, ...change });
            setLinkOptions({ ...dashboardLinkOptions, ...change });
          }}
        />
      ) : (
        <UrlDrilldownOptionsComponent
          options={externalLinkOptions}
          onOptionChange={(change) => {
            setExternalLinkOptions({ ...externalLinkOptions, ...change });
            setLinkOptions({ ...externalLinkOptions, ...change });
          }}
        />
      )}
    </EuiFormRow>
  );
};

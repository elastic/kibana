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
  DashboardNavigationOptionsEditor,
  DEFAULT_DASHBOARD_NAVIGATION_OPTIONS,
} from '@kbn/dashboard-plugin/public';
import type { DashboardNavigationOptions } from '@kbn/dashboard-plugin/server';
import type { LinkType } from '../../../common/content_management';
import { EXTERNAL_LINK_TYPE, DASHBOARD_LINK_TYPE } from '../../../common/content_management';
import { LinksStrings } from '../links_strings';
import type { UnorderedLink } from '../../editor/open_link_editor_flyout';
import type { ExternalLinkOptions, LinkOptions } from '../../../server';
import { DEFAULT_EXTERNAL_LINK_OPTIONS } from '../external_link/constants';
import { ExternalLinkOptionsEditor } from '../external_link/external_link_options_edtior';

export const LinkOptionsComponent = ({
  link,
  setLinkOptions,
  selectedLinkType,
}: {
  selectedLinkType: LinkType;
  link?: UnorderedLink;
  setLinkOptions: (options: LinkOptions) => void;
}) => {
  const [dashboardLinkOptions, setDashboardLinkOptions] = useState<DashboardNavigationOptions>({
    ...DEFAULT_DASHBOARD_NAVIGATION_OPTIONS,
    ...(link && link.type === DASHBOARD_LINK_TYPE ? link.options : {}),
  });
  const [externalLinkOptions, setExternalLinkOptions] = useState<ExternalLinkOptions>({
    ...DEFAULT_EXTERNAL_LINK_OPTIONS,
    ...(link && link.type === EXTERNAL_LINK_TYPE ? link.options : {}),
  });

  return (
    <EuiFormRow label={LinksStrings.editor.linkEditor.getLinkOptionsLabel()}>
      {selectedLinkType === DASHBOARD_LINK_TYPE ? (
        <DashboardNavigationOptionsEditor
          options={dashboardLinkOptions}
          onOptionChange={(change) => {
            setDashboardLinkOptions({ ...dashboardLinkOptions, ...change });
            setLinkOptions({ ...dashboardLinkOptions, ...change });
          }}
        />
      ) : (
        <ExternalLinkOptionsEditor
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

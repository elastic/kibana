/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionButtons } from './action_buttons';
import { ActionsSubTitle } from './actions_sub_title';
import type { ComponentData } from '../../../../lib/get_inspected_element_data';

interface Props {
  componentData: ComponentData;
  branch: string;
}

export const ActionsSection = ({ componentData, branch }: Props) => {
  const { columnNumber, fileName, lineNumber, relativePath, baseFileName } = componentData.fileData;

  return (
    <>
      <EuiTitle size="s" data-test-subj="inspectComponentActionsTitle">
        <h3>
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.actionsSection.title"
            defaultMessage="Actions"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ActionsSubTitle relativePath={relativePath} baseFileName={baseFileName} />
      <ActionButtons
        fileName={fileName}
        lineNumber={lineNumber}
        columnNumber={columnNumber}
        relativePath={relativePath}
        branch={branch}
      />
    </>
  );
};

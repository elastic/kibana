/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiText, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useProjectPickerActions, useProjectPickerState } from '../../../state';

export function ProjectPickerFrameFooter() {
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();

  const includeAllVisibleProjects = useCallback(() => {
    actions.includeAllVisibleProjects();
  }, [actions]);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow>
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('cpsUtils.projectPicker.frameFooter.description', {
              defaultMessage: '{filteredProjectsCount} included',
              values: {
                filteredProjectsCount: state.selectedProjects.length,
              },
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          disabled={state.selectedProjects.length === state.visibleProjectIds.length}
          onClick={includeAllVisibleProjects}
          flush="right"
          size="xs"
        >
          {i18n.translate('cpsUtils.projectPicker.frameFooter.addProject', {
            defaultMessage: 'Include all visible',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

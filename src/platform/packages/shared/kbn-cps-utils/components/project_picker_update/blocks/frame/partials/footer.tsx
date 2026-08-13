/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiText, EuiFlexItem, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { useProjectPickerActions, useProjectPickerState } from '../../../state';

export function ProjectPickerFrameFooter() {
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();

  const { includedCount, excludedCount } = useMemo(() => {
    const selected = new Set(state.selectedProjects);
    const included = state.visibleProjectIds.filter((id) => selected.has(id)).length;
    return {
      includedCount: included,
      excludedCount: state.visibleProjectIds.length - included,
    };
  }, [state.visibleProjectIds, state.selectedProjects]);

  const includeAllVisibleProjects = useCallback(() => {
    actions.includeAllVisibleProjects();
  }, [actions]);

  const isActionBtnDisabled = useMemo(() => {
    return state.visibleProjectIds.length === 0 || includedCount === state.visibleProjectIds.length;
  }, [state.visibleProjectIds.length, includedCount]);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow>
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('cpsUtils.projectPicker.frameFooter.description', {
              defaultMessage: '{includedCount} included · {excludedCount} excluded',
              values: { includedCount, excludedCount },
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {React.createElement(isActionBtnDisabled ? EuiToolTip : React.Fragment, {
          ...(isActionBtnDisabled
            ? {
                content: i18n.translate(
                  'cpsUtils.projectPicker.frameFooter.includeAllVisibleProjectTooltip',
                  {
                    defaultMessage: 'All listed projects are included.',
                  }
                ),
              }
            : {}),
          children: (
            <EuiButtonEmpty
              disabled={isActionBtnDisabled}
              onClick={includeAllVisibleProjects}
              flush="right"
              size="xs"
            >
              {i18n.translate('cpsUtils.projectPicker.frameFooter.addProject', {
                defaultMessage: 'Include all visible',
              })}
            </EuiButtonEmpty>
          ),
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

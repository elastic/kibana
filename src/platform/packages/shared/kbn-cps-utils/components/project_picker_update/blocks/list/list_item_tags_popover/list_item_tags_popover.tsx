/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import type { EuiWrappingPopoverProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiWrappingPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { getProjectTags } from '../../../../utils';
import { FilterBadge } from '../../filter_badge/filter_badge';
import { useProjectPickerState } from '../../../state';
import { getFilterExpressionLookupKey } from '../../../utils/filter_input_codec';
import type { FilterExpressionValue } from '../../../utils/filter_input_codec';
import { FilterOperator } from '../../../utils/filter_input_codec';
import { useProjectPickerActions } from '../../../state';
import { projectTagsStyles } from './list_item_tags_popover.styles';

interface ProjectPickerListItemTagsPopoverProps extends Pick<EuiWrappingPopoverProps, 'button'> {
  isOpen: boolean;
  closeHandler: () => void;
  projectTags: ReturnType<typeof getProjectTags>;
}

export function ProjectPickerListItemTagsPopover({
  button,
  closeHandler,
  isOpen,
  projectTags,
}: ProjectPickerListItemTagsPopoverProps) {
  const state = useProjectPickerState();
  const actions = useProjectPickerActions();
  const { euiTheme } = useEuiTheme();
  const styles = projectTagsStyles(euiTheme);
  const isFilterAlreadyAdded = (filter: FilterExpressionValue) =>
    state.filterExpressions.has(getFilterExpressionLookupKey(filter));

  const addFilterAction = useCallback(
    (filter: FilterExpressionValue) => {
      actions.addFilterExpression({
        expression: filter,
      });
    },
    [actions]
  );

  return (
    <EuiWrappingPopover
      button={button}
      isOpen={isOpen}
      css={styles.projectTagsBadgeContainer}
      panelPaddingSize="m"
      anchorPosition="downLeft"
      aria-label={i18n.translate('cpsUtils.projectPicker.list.projectTags.ariaLabel', {
        defaultMessage: 'Project tags',
      })}
      closePopover={closeHandler}
    >
      <EuiFlexGroup direction="column" responsive={false} gutterSize="s">
        {projectTags.map((tag) => {
          const filter: FilterExpressionValue = {
            operator: FilterOperator.EQUALS,
            tagName: tag.tagName,
            tagValue: tag.tagValue,
          };

          const isAlreadyAdded = isFilterAlreadyAdded(filter);

          return (
            <EuiFlexItem key={`${tag.tagName}.${tag.tagValue}`} grow={false}>
              {React.createElement(isAlreadyAdded ? EuiToolTip : React.Fragment, {
                ...(isAlreadyAdded
                  ? {
                      content: i18n.translate(
                        'cpsUtils.projectPicker.list.projectTags.filterAlreadyAdded',
                        {
                          defaultMessage: 'Filter already added',
                        }
                      ),
                    }
                  : {}),
                children: (
                  <FilterBadge
                    css={styles.projectTagsBadge}
                    isDisabled={isAlreadyAdded}
                    filter={filter}
                    {...(state.isReadOnly
                      ? {
                          iconType: 'empty',
                          color: 'default',
                        }
                      : {
                          iconSide: 'right',
                          iconType: 'plusCircle',
                          onClick: addFilterAction.bind(null, filter),
                          onClickAriaLabel: i18n.translate(
                            'cpsUtils.projectPicker.list.projectTags.addFilterAriaLabel',
                            {
                              defaultMessage: 'Add filter to project',
                            }
                          ),
                        })}
                  />
                ),
              })}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiWrappingPopover>
  );
}

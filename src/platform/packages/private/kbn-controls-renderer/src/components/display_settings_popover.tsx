/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useMemo } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiPopover, EuiFormRow, EuiButtonGroup, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ControlWidth } from '@kbn/controls-schemas';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { ControlsRendererParentApi } from '../types';

interface DisplaySettingsPopoverProps {
  isOpen: boolean;
  closePopover: () => void;
  grow?: boolean;
  width?: ControlWidth;
  parentApi: ControlsRendererParentApi;
  uuid: string;
}

export const DisplaySettingsPopover: React.FC<
  React.PropsWithChildren<DisplaySettingsPopoverProps>
> = ({
  isOpen,
  closePopover,
  grow = DEFAULT_CONTROL_GROW,
  width = DEFAULT_CONTROL_WIDTH,
  children,
  parentApi,
  uuid,
}) => {
  const layoutState = parentApi.layout$.value;
  const layoutEntry = useMemo(() => layoutState.controls[uuid], [layoutState, uuid]);

  const applyNextLayout = useCallback(
    (nextGrow: boolean, nextWidth: ControlWidth) => {
      const currentLayout = parentApi.layout$.getValue();
      parentApi.layout$.next({
        ...currentLayout,
        controls: {
          ...currentLayout.controls,
          [uuid]: {
            ...layoutEntry,
            grow: nextGrow,
            width: nextWidth,
          },
        },
      });
    },
    [parentApi.layout$, uuid, layoutEntry]
  );

  const onWidthChange = useCallback(
    (id: string) => {
      applyNextLayout(grow, id as ControlWidth);
    },
    [applyNextLayout, grow]
  );
  const onGrowChange = useCallback(
    (e: EuiSwitchEvent) => {
      applyNextLayout(e.target.checked, width);
    },
    [applyNextLayout, width]
  );
  return (
    <EuiPopover
      display="flex"
      repositionOnScroll
      panelPaddingSize="m"
      anchorPosition="downLeft"
      button={children ?? <div />}
      isOpen={isOpen}
      closePopover={closePopover}
      focusTrapProps={{
        closeOnMouseup: true,
        clickOutsideDisables: false,
        onClickOutside: closePopover,
      }}
    >
      <EuiFormRow
        label={i18n.translate(
          'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.label',
          {
            defaultMessage: 'Minimum width',
          }
        )}
        fullWidth
      >
        <EuiButtonGroup
          legend={i18n.translate(
            'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.label',
            {
              defaultMessage: 'Minimum width',
            }
          )}
          options={[
            {
              id: `small`,
              label: i18n.translate(
                'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.small',
                {
                  defaultMessage: 'Small',
                }
              ),
            },
            {
              id: `medium`,
              label: i18n.translate(
                'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.medium',
                {
                  defaultMessage: 'Medium',
                }
              ),
            },
            {
              id: `large`,
              label: i18n.translate(
                'controls.controlGroup.floatingActions.editDisplaySettings.minimumWidth.large',
                {
                  defaultMessage: 'Large',
                }
              ),
            },
          ]}
          idSelected={width}
          onChange={onWidthChange}
          type="single"
          isFullWidth
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        label={i18n.translate(
          'controls.controlGroup.floatingActions.editDisplaySettings.grow.label',
          {
            defaultMessage: 'Expand width to fit available space',
          }
        )}
        color="primary"
        checked={grow}
        onChange={onGrowChange}
      />
    </EuiPopover>
  );
};

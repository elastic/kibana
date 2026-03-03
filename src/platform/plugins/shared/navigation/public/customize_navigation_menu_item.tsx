/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiContextMenuItem, EuiIcon } from '@elastic/eui';
import React, { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';

import type { CoreStart } from '@kbn/core/public';
import type {
  NavigationCustomization,
  NavigationItemInfo,
  SolutionId,
} from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

export interface CustomizeNavigationMenuItemProps {
  core: CoreStart;
  closePopover: () => void;
  getNavigationPrimaryItems: () => NavigationItemInfo[];
  setNavigationCustomization: (
    id: SolutionId,
    customization: NavigationCustomization | undefined
  ) => void;
  setIsEditingNavigation: (isEditing: boolean) => void;
}

export const CustomizeNavigationMenuItem: React.FC<CustomizeNavigationMenuItemProps> = ({
  core,
  closePopover,
  getNavigationPrimaryItems,
  setNavigationCustomization,
  setIsEditingNavigation,
}) => {
  const solutionId = useObservable(core.chrome.getActiveSolutionNavId$(), null);

  const handleClick = useCallback(async () => {
    if (!solutionId) return;
    closePopover();

    const { CustomizeNavigationModal } = await import('@kbn/core-chrome-navigation');

    const session = core.overlays.openModal(
      toMountPoint(
        <CustomizeNavigationModal
          solutionId={solutionId}
          onClose={() => session.close()}
          getNavigationPrimaryItems={getNavigationPrimaryItems}
          setNavigationCustomization={setNavigationCustomization}
          setIsEditingNavigation={setIsEditingNavigation}
        />,
        core
      ),
      {
        'data-test-subj': 'customizeNavigationModal',
      }
    );
  }, [
    solutionId,
    closePopover,
    core,
    getNavigationPrimaryItems,
    setNavigationCustomization,
    setIsEditingNavigation,
  ]);

  if (!solutionId) {
    return null;
  }

  return (
    <EuiContextMenuItem
      icon={<EuiIcon type="controls" size="m" aria-hidden={true} />}
      size="s"
      onClick={handleClick}
      data-test-subj="customizeNavigationButton"
    >
      {i18n.translate('navigation.customizeNavigationLabel', {
        defaultMessage: 'Customize navigation',
      })}
    </EuiContextMenuItem>
  );
};

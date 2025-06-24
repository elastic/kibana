/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { EuiButton, EuiIcon, EuiNotificationBadge, EuiButtonProps } from '@elastic/eui';

import { LabsFlyout, Props as FlyoutProps } from './labs_flyout';
import { getPresentationLabsService } from '../../services/presentation_labs_service';

export type Props = EuiButtonProps & Pick<FlyoutProps, 'solutions'>;

export const LabsBeakerButton = ({ solutions, ...props }: Props) => {
  const labsService = useMemo(() => getPresentationLabsService(), []);

  const [isOpen, setIsOpen] = useState(false);

  const projects = labsService.getProjects();

  const [overrideCount, onEnabledCountChange] = useState(
    Object.values(projects).filter((project) => project.status.isOverride).length
  );

  const onButtonClick = () => setIsOpen((open) => !open);
  const onClose = () => setIsOpen(false);

  return (
    <>
      <EuiButton {...props} onClick={onButtonClick} minWidth={0}>
        <EuiIcon type="beaker" />
        {overrideCount > 0 ? (
          <EuiNotificationBadge color="subdued" css={{ marginLeft: 2 }}>
            {overrideCount}
          </EuiNotificationBadge>
        ) : null}
      </EuiButton>
      {isOpen ? <LabsFlyout {...{ onClose, solutions, onEnabledCountChange }} /> : null}
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default LabsBeakerButton;

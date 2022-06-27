/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { EuiContextMenuPanel } from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  menuItems: ReactElement[];
}

export function SavedObjectFinderCreateNew({ menuItems }: Props) {
  const [isCreateMenuOpen, setCreateMenuOpen] = useState(false);
  const toggleCreateMenu = () => {
    setCreateMenuOpen(!isCreateMenuOpen);
  };
  const closeCreateMenu = () => {
    setCreateMenuOpen(false);
  };
  return (
    <EuiPopover
      id="createNew"
      button={
        <EuiButton
          data-test-subj="createNew"
          iconType="plusInCircle"
          iconSide="left"
          onClick={toggleCreateMenu}
          fill
        >
          <FormattedMessage
            id="embeddableApi.addPanel.createNewDefaultOption"
            defaultMessage="Create new"
          />
        </EuiButton>
      }
      isOpen={isCreateMenuOpen}
      closePopover={closeCreateMenu}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
}

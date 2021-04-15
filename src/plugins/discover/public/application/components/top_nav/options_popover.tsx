/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiLink, EuiText, EuiWrappingPopover } from '@elastic/eui';
import { getServices } from '../../../kibana_services';
import './open_options_popover.scss';

interface OptionsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
}

export const OptionsPopover = (props: OptionsPopoverProps) => {
  const {
    core: { uiSettings },
    addBasePath,
  } = getServices();
  const isLegacy = uiSettings.get('doc_table:legacy');

  const linkText = isLegacy
    ? i18n.translate('discover.openOptionsPopover.switchToDataGridText', {
        defaultMessage: 'Switch to data grid',
      })
    : i18n.translate('discover.openOptionsPopover.switchToLegacyText', {
        defaultMessage: 'Switch to legacy table',
      });

  return (
    <EuiWrappingPopover ownFocus button={props.anchorElement} closePopover={props.onClose} isOpen>
      <div className="dscOptionsPopover">
        <EuiLink href={addBasePath('/app/management/kibana/settings?query=Use legacy table')}>
          {linkText}
        </EuiLink>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="discover.topNav.openOptionsPopover.description"
            defaultMessage="The new data grid layout includes better data sorting, drag-and-drop columns, and a full
                screen view. Enable this option if you prefer to fall back to the legacy table."
          />
        </EuiText>
      </div>
    </EuiWrappingPopover>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { OptionsPopover as default };

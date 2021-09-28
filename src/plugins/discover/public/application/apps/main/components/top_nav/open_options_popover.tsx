/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { EuiWrappingPopover, EuiButtonEmpty, EuiTextAlign } from '@elastic/eui';
import './open_options_popover.scss';
import { getServices } from '../../../../../kibana_services';

const container = document.createElement('div');
let isOpen = false;

interface OptionsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
}

export function OptionsPopover(props: OptionsPopoverProps) {
  const { addBasePath } = getServices();

  return (
    <EuiWrappingPopover ownFocus button={props.anchorElement} closePopover={props.onClose} isOpen>
      <div className="dscOptionsPopover">
        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty
            iconType="gear"
            size="s"
            href={addBasePath(`/app/management/kibana/settings?query=category:(discover)`)}
          >
            {i18n.translate('discover.openOptionsPopover.gotToAllSettings', {
              defaultMessage: 'All Discover options',
            })}
          </EuiButtonEmpty>
        </EuiTextAlign>
      </div>
    </EuiWrappingPopover>
  );
}

function onClose() {
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export function openOptionsPopover({
  I18nContext,
  anchorElement,
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
}) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <I18nContext>
      <OptionsPopover onClose={onClose} anchorElement={anchorElement} />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}

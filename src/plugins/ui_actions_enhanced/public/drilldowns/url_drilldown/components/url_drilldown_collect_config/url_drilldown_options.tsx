/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiFormRow, EuiSpacer, EuiSwitch, EuiTextColor } from '@elastic/eui';

import {
  txtUrlTemplateEncodeDescription,
  txtUrlTemplateEncodeUrl,
  txtUrlTemplateOpenInNewTab,
  txtUrlTemplateOverflow,
  txtUrlTemplateOverflowEllipsis,
  txtUrlTemplateOverflowTextWrap,
} from './i18n';
import { UrlDrilldownOptions } from '../../types';

export interface UrlDrilldownOptionsProps {
  options: UrlDrilldownOptions;
  onOptionChange: (newOptions: Partial<UrlDrilldownOptions>) => void;
}

export const UrlDrilldownOptionsComponent = ({
  options,
  onOptionChange,
}: UrlDrilldownOptionsProps) => {
  const [toggleCompressedIdSelected, setToggleCompressedIdSelected] = useState(`__1`);
  const toggleButtonsCompressed = [
    {
      id: `__0`,
      label: txtUrlTemplateOverflowEllipsis,
    },
    {
      id: `__1`,
      label: txtUrlTemplateOverflowTextWrap,
    },
  ];

  const onChangeCompressed = (optionId: React.SetStateAction<string>) => {
    setToggleCompressedIdSelected(optionId);
  };
  return (
    <>
      <EuiFormRow>
        <div>
          <EuiSwitch
            compressed
            id="openInNewTab"
            name="openInNewTab"
            label={txtUrlTemplateOpenInNewTab}
            checked={options.openInNewTab}
            onChange={() => onOptionChange({ openInNewTab: !options.openInNewTab })}
            data-test-subj="urlDrilldownOpenInNewTab"
          />
          <EuiSpacer size="s" />
          <EuiSwitch
            compressed
            id="encodeUrl"
            name="encodeUrl"
            label={
              <>
                {txtUrlTemplateEncodeUrl}
                <EuiSpacer size={'s'} />
                <EuiTextColor color="subdued">{txtUrlTemplateEncodeDescription}</EuiTextColor>
              </>
            }
            checked={options.encodeUrl}
            onChange={() => onOptionChange({ encodeUrl: !options.encodeUrl })}
            data-test-subj="urlDrilldownEncodeUrl"
          />
          <EuiSpacer size="s" />
          <EuiFormRow label={txtUrlTemplateOverflow}>
            <EuiButtonGroup
              legend={txtUrlTemplateOverflow}
              options={toggleButtonsCompressed}
              idSelected={toggleCompressedIdSelected}
              onChange={(id) => onChangeCompressed(id)}
              buttonSize="compressed"
            />
          </EuiFormRow>
        </div>
      </EuiFormRow>
    </>
  );
};

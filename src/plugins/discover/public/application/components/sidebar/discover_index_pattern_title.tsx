/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiToolTip, EuiFlexItem, EuiFlexGroup, EuiTitle, EuiButtonEmpty } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
export interface DiscoverIndexPatternTitleProps {
  /**
   * determines whether the change link is displayed
   */
  isChangeable: boolean;
  /**
   * function triggered when the change link is clicked
   */
  onChange: () => void;
  /**
   * title of the current index pattern
   */
  title: string;
}

/**
 * Component displaying the title of the current selected index pattern
 * and if changeable is true, a link is provided to change the index pattern
 */
export function DiscoverIndexPatternTitle({
  isChangeable,
  onChange,
  title,
}: DiscoverIndexPatternTitleProps) {
  return (
    <EuiFlexGroup gutterSize="none" responsive={false} className="index-pattern-selection">
      <EuiFlexItem className="eui-textTruncate">
        <EuiToolTip content={title}>
          <EuiTitle size="xxs" className="eui-textTruncate">
            <h2 title={title}>{title}</h2>
          </EuiTitle>
        </EuiToolTip>
      </EuiFlexItem>
      {isChangeable && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              <FormattedMessage
                id="discover.fieldChooser.indexPattern.changeLinkTooltip"
                defaultMessage="Change current index pattern"
              />
            }
          >
            <EuiButtonEmpty
              aria-label={i18n.translate('discover.fieldChooser.indexPattern.changeLinkAriaLabel', {
                defaultMessage: 'Change current index pattern',
              })}
              data-test-subj="indexPattern-switch-link"
              size="xs"
              onClick={() => onChange()}
              iconSide="right"
              iconType="arrowDown"
              color="text"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

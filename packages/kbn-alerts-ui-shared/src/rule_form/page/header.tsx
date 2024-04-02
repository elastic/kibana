/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { EuiPageTemplate, EuiIcon, EuiFieldText, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { useRuleNameGuard } from '../hooks';

export interface RuleFormPageHeaderProps {
  ruleName: string;
  onChangeName: (name: string) => void;
  onClickReturn: () => void;
  referrerHref: string;
}

export const RuleFormPageHeader: React.FC<RuleFormPageHeaderProps> = ({
  ruleName,
  onChangeName,
  onClickReturn,
  referrerHref,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { euiTheme } = useEuiTheme();
  const { onRuleNameFocus, onRuleNameBlur } = useRuleNameGuard();

  const onClickEdit = useCallback(() => {
    onRuleNameFocus();
    setIsEditing(true);
  }, [onRuleNameFocus]);
  const finishEditingRuleName = useCallback(() => {
    setIsEditing(false);
    onRuleNameBlur();
  }, [onRuleNameBlur, setIsEditing]);

  const pageTitle = isEditing ? (
    <EuiFieldText
      autoFocus
      fullWidth
      value={ruleName}
      isInvalid={!ruleName}
      onChange={({ target: { value } }) => onChangeName(value)}
      onBlur={finishEditingRuleName}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          finishEditingRuleName();
        }
      }}
      style={{
        fontSize: 'inherit',
        fontWeight: 'inherit',
        lineHeight: 'inherit',
        padding: 'inherit',
        boxShadow: 'none',
        backgroundColor: euiTheme.colors.lightestShade,
      }}
    />
  ) : (
    <>
      {/* keyboard nav is handled by button icon, click handler on span provides extra
       * convenience for mouse users
       */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <span onClick={onClickEdit}>{ruleName}</span>{' '}
      <EuiButtonIcon iconType="pencil" onClick={onClickEdit} aria-label="Edit rule name" />
    </>
  );

  return (
    <EuiPageTemplate.Header
      pageTitle={pageTitle}
      breadcrumbs={[
        {
          text: (
            <>
              <EuiIcon size="s" type="arrowLeft" /> Return
            </>
          ),
          color: 'primary',
          'aria-current': false,
          href: referrerHref,
          onClick: (e) => {
            e.preventDefault();
            onClickReturn();
          },
        },
      ]}
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiFlyoutResizableProps } from '@elastic/eui';
import { EuiFlyoutResizable, EuiLoadingElastic } from '@elastic/eui';
import React, { Suspense, lazy, useCallback } from 'react';
import { css } from '@emotion/react';
import type { RuleFormProps } from '../src/rule_form';
import type { RuleTypeMetaData } from '../src/types';
import {
  RuleFlyoutUIContextProvider,
  useRuleFlyoutUIContext,
  RuleFormErrorPromptWrapper,
} from '../lib';

const RuleForm: React.LazyExoticComponent<React.FC<RuleFormProps<any>>> = lazy(() =>
  import('../src/rule_form').then((module) => ({ default: module.RuleForm }))
);

const inLineContainerCss = css`
  container-type: inline-size;
`;

interface RuleFormFlyoutRendererProps<MetaData extends RuleTypeMetaData> {
  ruleFormProps: RuleFormProps<MetaData>;
  focusTrapProps?: EuiFlyoutResizableProps['focusTrapProps'];
  renderFlyout?: boolean;
  onClose?: () => void;
}

const RuleFormFlyoutRenderer = <MetaData extends RuleTypeMetaData>({
  ruleFormProps,
  focusTrapProps,
  renderFlyout = true,
  onClose: externalOnClose,
}: RuleFormFlyoutRendererProps<MetaData>) => {
  const { onClickClose, hideCloseButton } = useRuleFlyoutUIContext();

  const onClose = useCallback(() => {
    if (externalOnClose) {
      externalOnClose();
      return;
    }
    // If onClickClose has been initialized, call it instead of onCancel. onClickClose should be used to
    // determine if the close confirmation modal should be shown. props.onCancel is passed down the component hierarchy
    // and will be called 1) by onClickClose, if the confirmation modal doesn't need to be shown, or 2) by the confirm
    // button on the confirmation modal
    if (onClickClose) {
      onClickClose();
    } else {
      // ONLY call props.onCancel directly from this level of the component hierarcht if onClickClose has not yet been initialized.
      // This will only occur if the user tries to close the flyout while the Suspense fallback is still visible
      ruleFormProps.onCancel?.();
    }
  }, [onClickClose, ruleFormProps, externalOnClose]);

  const content = (
    <Suspense
      fallback={
        <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
          <EuiLoadingElastic size="xl" />
        </RuleFormErrorPromptWrapper>
      }
    >
      <RuleForm {...ruleFormProps} isFlyout focusTrapProps={focusTrapProps} />
    </Suspense>
  );

  if (!renderFlyout) {
    return content;
  }

  return (
    <EuiFlyoutResizable
      ownFocus
      css={inLineContainerCss}
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      size={620}
      minWidth={500}
      hideCloseButton={hideCloseButton}
      focusTrapProps={focusTrapProps}
    >
      {content}
    </EuiFlyoutResizable>
  );
};

interface RuleFormFlyoutProps<MetaData extends RuleTypeMetaData> extends RuleFormProps<MetaData> {
  focusTrapProps?: EuiFlyoutResizableProps['focusTrapProps'];
  renderFlyout?: boolean;
  onClose?: () => void;
}

export const RuleFormFlyout = <MetaData extends RuleTypeMetaData>({
  focusTrapProps,
  renderFlyout,
  onClose,
  ...ruleFormProps
}: RuleFormFlyoutProps<MetaData>) => {
  return (
    <RuleFlyoutUIContextProvider>
      <RuleFormFlyoutRenderer
        ruleFormProps={ruleFormProps}
        focusTrapProps={focusTrapProps}
        renderFlyout={renderFlyout}
        onClose={onClose}
      />
    </RuleFlyoutUIContextProvider>
  );
};

/**
 * RuleFormFlyout component without the flyout wrapper - for use with imperative mounting
 * via overlays.openFlyout()
 */
export const RuleFormFlyoutContent = <MetaData extends RuleTypeMetaData>(
  props: RuleFormFlyoutProps<MetaData>
) => {
  return <RuleFormFlyout {...props} renderFlyout={false} />;
};

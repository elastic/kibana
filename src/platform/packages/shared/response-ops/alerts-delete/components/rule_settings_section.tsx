/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense, useState } from 'react';
import { EuiButton, EuiDescribedFormGroup } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../translations';

const ModalComponent = lazy(() => import('./modal'));

export const AlertDeleteRuleSettingsSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onCloseModal = () => setIsModalOpen(false);

  const onCleanUpClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <EuiDescribedFormGroup
        title={<h3>{i18n.RULE_SETTINGS_TITLE}</h3>}
        description={
          <EuiText color="subdued" size="s">
            <p>{i18n.RULE_SETTINGS_DESCRIPTION}</p>
          </EuiText>
        }
        css={css`
          flex-wrap: wrap;
        `}
        fieldFlexItemProps={{ css: { flexBasis: '100%' } }}
      >
        <EuiButton
          onClick={onCleanUpClick}
          iconType={'broom'}
          css={{ alignSelf: 'flex-start', width: 'auto' }}
          data-test-subj="alert-delete-open-modal-button"
        >
          {i18n.RUN_CLEANUP_TASK}
        </EuiButton>
      </EuiDescribedFormGroup>
      <Suspense fallback={<></>}>
        <ModalComponent onCloseModal={onCloseModal} isVisible={isModalOpen} />
      </Suspense>
    </>
  );
};

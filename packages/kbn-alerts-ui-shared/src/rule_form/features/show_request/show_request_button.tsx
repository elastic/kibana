/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { ShowRequestModal } from './show_request_modal';

interface ShowRequestButtonProps {
  isEdit?: boolean;
}

export const ShowRequestButton: React.FC<ShowRequestButtonProps> = ({ isEdit = false }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const onClose = useCallback(() => setIsModalVisible(false), []);
  return (
    <>
      <EuiButtonEmpty
        data-test-subj="showApiRequestButton"
        onClick={useCallback(() => setIsModalVisible(true), [])}
      >
        {i18n.translate('alertsUIShared.ruleForm.showRequestButton', {
          defaultMessage: 'Show API request',
        })}
      </EuiButtonEmpty>
      {isModalVisible && <ShowRequestModal onClose={onClose} isEdit={isEdit} />}
    </>
  );
};

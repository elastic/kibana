/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChatForm, ChatFormFields } from '../../types';
import { VideCodeFlyout } from './vide_code_flyout';

interface ViewCodeActionProps {}

export const ViewCodeAction: React.FC<ViewCodeActionProps> = () => {
  const { watch } = useFormContext<ChatForm>();
  const [showFlyout, setShowFlyout] = useState(false);
  const selectedIndices = watch(ChatFormFields.indices);

  return (
    <>
      {showFlyout && <VideCodeFlyout onClose={() => setShowFlyout(false)} />}
      <EuiButton
        iconType="editorCodeBlock"
        color="primary"
        fill
        onClick={() => setShowFlyout(true)}
        disabled={!selectedIndices || selectedIndices?.length === 0}
      >
        <FormattedMessage id="aiPlayground.viewCode.actionButtonLabel" defaultMessage="View code" />
      </EuiButton>
    </>
  );
};

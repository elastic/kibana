/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useState } from 'react';

interface LinksModalPageProps {
  isEmbedded: boolean;
  allowShortUrl: boolean;
  objectId?: string;
  onClose: () => void;
}

export const LinksModalPage: FC<LinksModalPageProps> = (props: LinksModalPageProps) => {
  const [selectedRadio, setSelectedRadio] = useState<string>('savedObject');
  const { objectId, onClose } = props;
  const isNotSaved = () => {
    return objectId === undefined || objectId === '';
  };
  const saveNeeded = isNotSaved() ? (
    <EuiFormRow
      helpText={
        <FormattedMessage
          id="share.linkModalPage.saveWorkDescription"
          defaultMessage="One or more panels on this dashboard have changed. Before you generate a snapshot, save the dashboard."
        />
      }
    >
      <EuiCodeBlock isCopyable>
        <EuiSpacer size="xs" />
        placeholder saved objects href
      </EuiCodeBlock>
    </EuiFormRow>
  ) : (
    <EuiCodeBlock isCopyable>
      <EuiSpacer size="xs" />
      placeholder saved objects href
    </EuiCodeBlock>
  );
  return (
    <EuiForm className="kbnShareContextMenu__finalPanel">
      <EuiRadioGroup
        options={[
          { id: 'savedObject', label: 'Saved object' },
          { id: 'snapshot', label: 'Snapshot' },
        ]}
        onChange={(id) => setSelectedRadio(id)}
        name="embed radio group"
        idSelected={selectedRadio}
      />
      <EuiSpacer size="m" />
      {saveNeeded}
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" justifyContent="flexEnd">
        <EuiButton fill onSubmit={onClose}>
          <FormattedMessage id="share.links.doneButton" defaultMessage="Done" />
        </EuiButton>
      </EuiFlexGroup>
    </EuiForm>
  );
};

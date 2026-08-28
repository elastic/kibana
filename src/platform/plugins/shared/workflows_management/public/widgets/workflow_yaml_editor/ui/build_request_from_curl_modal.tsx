/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { curlToRequestStep } from '../lib/curl/curl_to_request_step';

export interface BuildRequestFromCurlModalProps {
  connectorType: string;
  onClose: () => void;
  /** Called with the generated single-step YAML snippet when the user inserts it. */
  onInsert: (snippet: string) => void;
}

/**
 * A lightweight modal that turns a pasted cURL command into a `request` step for
 * the given connector. Auth is stripped (the connector injects its own), and a
 * relative `path` is used when the URL matches the connector's base URL.
 */
export const BuildRequestFromCurlModal = ({
  connectorType,
  onClose,
  onInsert,
}: BuildRequestFromCurlModalProps) => {
  const [curl, setCurl] = useState('');
  const modalTitleId = useMemo(
    () => `buildRequestFromCurl-${Math.random().toString(36).slice(2)}`,
    []
  );

  const result = useMemo(() => {
    if (!curl.trim()) {
      return null;
    }
    return curlToRequestStep(connectorType, curl);
  }, [connectorType, curl]);

  const canInsert = result?.ok === true;

  const handleInsert = () => {
    if (result?.ok) {
      onInsert(result.snippet);
      onClose();
    }
  };

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} maxWidth={640}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="workflows.buildRequestFromCurl.title"
            defaultMessage="Build a request from cURL"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('workflows.buildRequestFromCurl.inputLabel', {
            defaultMessage: 'Paste a cURL command',
          })}
          helpText={i18n.translate('workflows.buildRequestFromCurl.inputHelp', {
            defaultMessage:
              'Authentication is handled by the connector, so any auth headers you paste are ignored.',
          })}
          fullWidth
        >
          <EuiTextArea
            fullWidth
            rows={6}
            value={curl}
            onChange={(e) => setCurl(e.target.value)}
            placeholder={`curl -X POST https://api.example.com/v2/resource -d '{"key":"value"}'`}
            data-test-subj="buildRequestFromCurlInput"
            autoFocus
          />
        </EuiFormRow>

        {result && !result.ok && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.translate('workflows.buildRequestFromCurl.parseError', {
                defaultMessage: "Couldn't parse that cURL command",
              })}
            >
              {result.error}
            </EuiCallOut>
          </>
        )}

        {result?.ok && (
          <>
            {result.notes.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut announceOnMount={false} color="primary" size="s" iconType="info">
                  <ul style={{ margin: 0, paddingInlineStart: 16 }}>
                    {result.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </EuiCallOut>
              </>
            )}
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('workflows.buildRequestFromCurl.previewLabel', {
                defaultMessage: 'Preview',
              })}
              fullWidth
            >
              <EuiCodeBlock language="yaml" fontSize="s" paddingSize="s" isCopyable>
                {result.snippet}
              </EuiCodeBlock>
            </EuiFormRow>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage id="workflows.buildRequestFromCurl.cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleInsert}
          disabled={!canInsert}
          data-test-subj="buildRequestFromCurlInsert"
        >
          <FormattedMessage
            id="workflows.buildRequestFromCurl.insert"
            defaultMessage="Insert step"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

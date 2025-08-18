/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiBadge,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiTextArea,
  EuiFormRow,
  EuiText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

export function FeatureFlagsAction({
  core,
  initialFeatureFlags,
}: {
  core: CoreStart;
  initialFeatureFlags: Record<string, unknown>;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [overridesText, setOverridesText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Format initial feature flags as JSON when modal opens
  const initializeOverridesText = () => {
    try {
      const formatted = JSON.stringify(initialFeatureFlags, null, 2);
      setOverridesText(formatted);
    } catch (error) {
      setOverridesText('{\n  \n}');
    }
  };

  // Validate JSON input
  const validateJSON = (text: string): { isValid: boolean; error?: string; parsed?: any } => {
    if (!text.trim()) {
      return { isValid: false, error: 'JSON cannot be empty' };
    }

    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { isValid: false, error: 'JSON must be an object (not array or primitive)' };
      }
      return { isValid: true, parsed };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  };

  // Handle text changes with validation
  const handleTextChange = (text: string) => {
    setOverridesText(text);
    const validation = validateJSON(text);
    setValidationError(validation.isValid ? null : validation.error || null);
  };

  // Apply overrides via API
  const applyOverrides = async () => {
    const validation = validateJSON(overridesText);
    if (!validation.isValid) {
      return;
    }

    setIsLoading(true);
    try {
      await core.http.put('/internal/core/_settings', {
        body: JSON.stringify({
          'feature_flags.overrides': validation.parsed,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        version: '1',
      });

      core.notifications.toasts.addSuccess({
        title: 'Feature flag overrides applied successfully',
        text: 'The new overrides are now active.',
      });

      closeModal();
      location.reload();
    } catch (error) {
      core.notifications.toasts.addError(error as Error, {
        title: 'Failed to apply feature flag overrides',
        toastMessage: 'Check the browser console for more details.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setValidationError(null);
  };

  const showModal = () => {
    initializeOverridesText();
    setIsModalVisible(true);
  };

  const modalTitleId = useGeneratedHtmlId();

  return (
    <>
      <EuiBadge
        color="default"
        iconType="flag"
        onClick={showModal}
        onClickAriaLabel="Override Feature Flags"
      >
        Feature Flags
      </EuiBadge>

      {isModalVisible && (
        <EuiModal aria-labelledby={modalTitleId} onClose={closeModal} style={{ width: '600px' }}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>Feature Flag Overrides</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>
                Edit feature flag overrides in JSON format. These overrides will take precedence
                over the remote feature flag values.
              </p>
            </EuiText>
            <EuiSpacer size="m" />

            <EuiFormRow
              label="Feature Flag Overrides"
              helpText="Enter valid JSON with flag names as keys and their override values"
              fullWidth={true}
              error={validationError}
              isInvalid={!!validationError}
            >
              <EuiTextArea
                fullWidth
                value={overridesText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={12}
                placeholder='{\n  "myPlugin.myFlag": true,\n  "anotherPlugin.stringFlag": "variant-a"\n}'
                style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: '12px' }}
                isInvalid={!!validationError}
              />
            </EuiFormRow>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal} disabled={isLoading}>
              Cancel
            </EuiButtonEmpty>
            <EuiButton
              onClick={applyOverrides}
              fill
              isLoading={isLoading}
              disabled={!!validationError}
            >
              Apply Overrides
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
}

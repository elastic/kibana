/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiHorizontalRule, EuiPopover, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useState } from 'react';

export function Warnings({ warnings }: { warnings: React.ReactNode[] }) {
  const [open, setOpen] = useState(false);
  if (warnings.length === 0) return null;
  return (
    <>
      <EuiPopover
        isOpen={open}
        panelPaddingSize="none"
        closePopover={() => setOpen(false)}
        button={
          <EuiButtonEmpty
            color="warning"
            iconType="alert"
            onClick={() => setOpen(!open)}
            size="xs"
            data-test-subj="chart-inline-warning-button"
          >
            {i18n.translate('charts.warning.warningLabel', {
              defaultMessage:
                '{numberWarnings, number} {numberWarnings, plural, one {warning} other {warnings}}',
              values: {
                numberWarnings: warnings.length,
              },
            })}
          </EuiButtonEmpty>
        }
      >
        <div style={{ maxWidth: 512 }}>
          {warnings.map((w, i) => (
            <React.Fragment key={i}>
              <div
                css={{
                  padding: euiThemeVars.euiSizeS,
                }}
                data-test-subj="chart-inline-warning"
              >
                <EuiText size="s">{w}</EuiText>
              </div>
              {i < warnings.length - 1 && <EuiHorizontalRule margin="none" />}
            </React.Fragment>
          ))}
        </div>
      </EuiPopover>
    </>
  );
}

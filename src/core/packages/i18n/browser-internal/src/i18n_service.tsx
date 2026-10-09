/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiContext } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import { getEuiContextMapping } from './i18n_eui_mapping';

declare global {
  interface Window {
    __kbnInstallTranslationResilience__: boolean;
    __kbnTranslationsTelemetryEmitter__?: (message: string) => void;
  }
}

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
}
/**
 * Service that is responsible for i18n capabilities.
 * @internal
 */
export class I18nService {
  /**
   * Used exclusively to give a Context component to FatalErrorsService which
   * may render before Core successfully sets up or starts.
   *
   * Separated from `start` to disambiguate that this can be called from within
   * Core outside the lifecycle flow.
   * @internal
   */
  public getContext(): I18nStart {
    const euiContextMapping = getEuiContextMapping();

    const mapping = {
      ...euiContextMapping,
    };
    return {
      Context: function I18nContext({ children }) {
        return (
          <I18nProvider>
            <EuiContext i18n={{ mapping }}>{children}</EuiContext>
          </I18nProvider>
        );
      },
    };
  }

  public setup({ analytics }: SetupDeps): void {
    if (window.__kbnInstallTranslationResilience__) {
      analytics.registerEventType({
        eventType: 'translation-resilience',
        schema: {
          message: {
            type: 'text',
            _meta: {
              description:
                'Message from the translation resilience script. It will let us know when the translation resilience script is loaded and used.',
            },
          },
        },
      });
      window.__kbnTranslationsTelemetryEmitter__ = (message: string) => {
        analytics.reportEvent('translation-resilience', { message });
      };
    }
  }

  public start(): I18nStart {
    return this.getContext();
  }

  public stop() {
    // nothing to do here currently
  }
}

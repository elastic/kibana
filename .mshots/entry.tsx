import React from 'react';
import { createRoot } from 'react-dom/client';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { MemoryTab } from '../x-pack/solutions/observability/plugins/significant_events_app/public/pages/significant_events/components/memory/tab';

// I18nProvider throws unless the i18n engine has been initialized.
i18n.init({ locale: 'en-US', messages: {}, defaultLocale: 'en-US' });

(window as any).__render = (name: string) => {
  (globalThis as any).__memoryScenario = name;
  const host = document.getElementById('root')!;
  host.innerHTML = '';
  createRoot(host).render(
    <I18nProvider>
      <EuiProvider>
        <MemoryTab />
      </EuiProvider>
    </I18nProvider>
  );
};

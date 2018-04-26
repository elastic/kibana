import { metadata } from '../../metadata';
import { Notifier } from '../../notify';
import { UiSettingsClient } from '../../../ui_settings/public/ui_settings_client';

export function initUiSettingsApi(chrome) {
  const uiSettings = new UiSettingsClient({
    defaults: metadata.uiSettings.defaults,
    initialSettings: metadata.uiSettings.user,
    notify: new Notifier({ location: 'Config' })
  });

  chrome.getUiSettingsClient = function () {
    return uiSettings;
  };
}

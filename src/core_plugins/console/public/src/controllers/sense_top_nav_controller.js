import KbnTopNavControllerProvider from 'ui/kbn_top_nav/kbn_top_nav_controller';
import storage from '../storage';

export function SenseTopNavController(Private) {
  const KbnTopNavController = Private(KbnTopNavControllerProvider);

  const controller = new KbnTopNavController([
    {
      key: 'welcome',
      hideButton: true,
      template: `<sense-welcome></sense-welcome>`
    },
    {
      key: 'history',
      description: 'History',
      template: `<sense-history></sense-history>`
    },
    {
      key: 'settings',
      description: 'Settings',
      template: `<sense-settings></sense-settings>`
    },
    {
      key: 'help',
      description: 'Help',
      template: `<sense-help></sense-help>`
    },
  ]);

  if (storage.get('version_welcome_shown') !== '@@SENSE_REVISION') {
    controller.open('welcome')
  }

  return controller
}

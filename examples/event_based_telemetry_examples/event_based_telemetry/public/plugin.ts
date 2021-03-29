import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import {
  EventBasedTelemetryPluginSetup,
  EventBasedTelemetryPluginStart,
  AppPluginStartDependencies,
} from './types';

export class EventBasedTelemetryPlugin
  implements Plugin<EventBasedTelemetryPluginSetup, EventBasedTelemetryPluginStart> {
  public setup(core: CoreSetup): EventBasedTelemetryPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'eventBasedTelemetry',
      title: 'EventBasedTelemetry',
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('eventBasedTelemetry.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: 'EventBasedTelemetry',
          },
        });
      },
    };
  }

  public start(core: CoreStart): EventBasedTelemetryPluginStart {
    return {};
  }

  public stop() {}
}

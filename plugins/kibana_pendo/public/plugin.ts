import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import {
  KibanaPendoPluginSetup,
  KibanaPendoPluginStart,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME, API_KEY } from '../common';
import { Console } from 'console';

declare global {
  interface Window {
    pendo: any;
  }
}

export class KibanaPendoPlugin implements Plugin<KibanaPendoPluginSetup, KibanaPendoPluginStart> {
  public setup(core: CoreSetup): KibanaPendoPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'kibanaPendo',
      title: PLUGIN_NAME,
      chromeless: true,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    loadPendoScript();

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('kibanaPendo.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): KibanaPendoPluginStart {
    setupPendo();
    return {};
  }

  public stop() {}
}

export const loadPendoScript = () => {
  const script = document.createElement('script');
  script.src = `https://cdn.pendo.io/agent/static/${API_KEY}/pendo.js`;
  script.async = true;
  document.body.appendChild(script);
};

type User = {
  id: string,
  email: string,
  firstname: string,
  lastname: string,
  role: string,
  country: string,
  region: string,
  city: string
};
type Account = {
  id: string,
  accountName: string
}

function getUser(): User {
  const urlParams = new URLSearchParams(location.href);
  var user = urlParams.get('pendoVisitor');
  var userObj = JSON.parse(user!);

  return userObj;
}

function getAccount(): Account {
  const urlParams = new URLSearchParams(location.href);
  var account = urlParams.get('pendoAccount');
  var accountObj = JSON.parse(account!);
  return accountObj;
}
function areAnalyticsEnabled() {
  const urlParams = new URLSearchParams(location.href);
  var enabled = urlParams.get('analyticsEnabled');
  var enabledBool = (enabled === "true")
  return enabledBool;
}

export const setupPendo = () => {
  var user = getUser();
  var account = getAccount();
  if (areAnalyticsEnabled() && window.pendo) {
    window.pendo.initialize({
      apiKey: API_KEY,
      visitor: {
        id: user.id,
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        role: user.role,
        country: user.country,
        region: user.region,
        city: user.city
      },
      account: {
        id: account.id,
        accountName: account.accountName
      }
    });
  }
}

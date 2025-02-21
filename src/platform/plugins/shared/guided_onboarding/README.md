# Guided Onboarding

This plugin contains the code for the Guided Onboarding project. Guided onboarding consists of guides for Solutions (Enterprise Search, Observability, Security) that can be completed as a checklist of steps. The guides help users to ingest their data and to navigate to the correct Solutions pages.

The guided onboarding plugin includes a client-side code for the UI and the server-side code for the internal API.

The client-side code registers a button in the Kibana header that controls the guided onboarding panel (checklist) depending on the current state. There is also an API service exposed from the client-side start contract. The API service is intended for external use by other plugins that need to react to the guided onboarding state, for example hide or display UI elements if a guide step is active.

Besides the internal API routes, the server-side code also exposes a function to register guide configs from the server-side setup start contract. This function is intended for external use by any plugin that need to add a new guide or modify an existing one.

---

## Current functionality

The solution plugins register their config that specifies the title, the description and the steps of a guide. The config is fetched via an http request to a guided onboarding endpoint. This endpoint should only be used internally by the guided onboarding API service. The configs are basically just `js` objects that are loaded into the Kibana server memory on startup. Because configs are not expected to be changed by the user, we don’t need to use saved objects.

The UI uses the guide config to display the guide: its title, description and steps. Each step has a title, a description and a url where the user will be redirected when they start this step. When a step is completed, the dropdown panel will automatically open and display the next step. When a guide is completed, the panel will automatically open and display a completion message with a button that (optionally) redirects the user to a specific solution page.

A step is completed on the solution page code by calling a function in the guided onboarding API service when the user performs an expected action. A step can also be set to “manual completion” which means the dropdown will not automatically open and the user will only see a popover on the header button on step completion. That way, the UI allows the user to stay a little longer on the page after completing the expected action and explore.

The plugin’s state keeps track of which guide has been started and its current progress. The state also includes the information if the user has started any guide, has completed any guide or if they skipped the guided onboarding, or if they quit the guide before completion. We also store the date when the user first looked at the landing page and if they haven't started any guide, the header button is displayed for the first 30 days. When clicked, the button redirects the user back to the landing page to start a guide.

## Architecture description

The guided onboarding is currently implemented in a separate `guided_onboarding` plugin that contains the code for the header button ([link](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/guided_onboarding/public/components/guide_button.tsx)), the dropdown panel ([link](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/guided_onboarding/public/components/guide_panel.tsx)) and the API service ([link](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/guided_onboarding/public/services/api.service.ts)) exposed out of the client side that can be used by other plugins to get/update the state of the guided onboarding.

For example, when a user goes through the SIEM guide they are first taken to the integrations page where they follow some EUI tour steps and install the Elastic Agent and the Elastic Defend integration. The code on the integrations page uses the guided onboarding API service to check if a guide for the Elastic Defend integration is currently in progress. If yes, the page will display the EUI tour steps to guide the user. The page will also use the API service to update the guided onboarding state to the next step when the user completes the installation.

There is also a server side in the guided onboarding plugin that creates several endpoints for plugin only internal use. The endpoints are for fetching the guide configs, the state of the guided onboarding and to update the state.
The server side also exposes a function ([link](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/guided_onboarding/server/plugin.ts#L40)) that is used by consumers to register their guide configs. That way the config files are a part of the consumers code and the guided onboarding is only used as a framework.

Another part of the guided onboarding code is in the home plugin where the code for the landing page ([link](https://github.com/elastic/kibana/tree/main/src/platform/plugins/shared/home/public/application/components/guided_onboarding)) is situated. The landing page can be found under `/app/home#/getting_started` and there is some logic ([link](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/home/public/application/components/home.tsx#L200)) that redirects the user to the landing page when the deployment is new (i.e. there is no data in the deployment). Some of the static components for the landing page were extracted to the `kbn-guided-onboarding` package ([link](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-guided-onboarding)).

When starting Kibana with `yarn start --run-examples` the `guided_onboarding_example` plugin ([link](https://github.com/elastic/kibana/tree/main/examples/guided_onboarding_example)) can be found under `/app/guidedOnboardingExample`. This page displays the current state of the guided onboarding and allows setting the state to any point in the guide. Otherwise, it can be difficult and time consuming to reach a specific step in a production guide during dev work. The example plugin also registers a config for a test guide that can be completed on the pages of the example plugin. The test guide is also used for unit and functional tests of the guided onboarding plugin.

## Development

1. Guided onboarding is only enabled on cloud. Update your `kibana.dev.yml` file with `xpack.cloud.id: 'testID'` to imitate the Cloud environment.

2. Start Kibana with the example plugins enabled: `yarn start --run-examples`.

3. Navigate to `/app/home#/getting_started` to view the onboarding landing page and start a guide. Alternatively, you can also start a guide within the guided onboarding example plugin at `/app/guidedOnboardingExample`. The example plugin includes a sample guide that showcases the framework's capabilities. It also provides a form to dynamically start a guide at a specific step.

## Client side: API service

_Also see `KIBANA_FOLDER/examples/guided_onboarding_example` for code examples._

The guided onboarding plugin exposes an API service from its start contract that is intended to be used by other plugins. The API service allows consumers to access the current state of the guided onboarding process and manipulate it.

To use the API service in your plugin, declare the guided onboarding plugin as a dependency in the file `kibana.json` of your plugin. Add the API service to your plugin's start dependencies to rely on the provided TypeScript interface:

```js
export interface AppPluginStartDependencies {
  guidedOnboarding?: GuidedOnboardingPluginStart;
}
```

The API service is now available to your plugin in the setup lifecycle function of your plugin

```js
// startDependencies is of type AppPluginStartDependencies
const [coreStart, startDependencies] = await core.getStartServices();
```

or in the start lifecycle function of your plugin.

```js
public start(core: CoreStart, startDependencies: AppPluginStartDependencies) {
  ...
}
```

### isGuideStepActive$(guideId: GuideId, stepId: GuideStepIds): Observable\<boolean\>

_Also see `KIBANA_FOLDER/examples/guided_onboarding_example/public/components/step_one.tsx`._

The API service exposes an Observable that contains a boolean value for the state of a specific guide step. For example, if your plugin needs to check if the "Add data" step of the SIEM guide is currently active, you could use the following code snippet.

```js
useEffect(() => {
  const subscription = guidedOnboardingApi
    ?.isGuideStepActive$('siem', 'add_data')
    .subscribe((isDataStepActive) => {
      // do some logic depending on the step state
    });
  return () => subscription?.unsubscribe();
}, [guidedOnboardingApi]);
```

### isGuideStepReadyToComplete$(guideId: GuideId, stepId: GuideStepIds): Observable\<boolean\>

Similar to `isGuideStepActive$`, the observable `isGuideStepReadyToComplete$` can be used to track the state of a step that is configured for manual completion. The observable broadcasts `true` when the manual completion popover is displayed and the user can mark the step "done". In this state the step is not in progress anymore but is not yet fully completed.

### completeGuideStep(guideId: GuideId, stepId: GuideStepIds, params?: GuideParams): Promise\<{ pluginState: PluginState } | undefined\>

The API service exposes an async function to mark a guide step as completed.
If the specified guide step is not currently active, the function is a noop. In that case the return value is `undefined`,
otherwise an updated `PluginState` is returned.

```
await guidedOnboardingApi?.completeGuideStep('siem', 'add_data');
```

The function also accepts an optional argument `params` that will be saved in the state and later used for step URLs with dynamic parameters. For example, step 2 of the guide has a dynamic parameter `indexID` in its location path:

```js
const step2Config = {
  id: 'step2',
  description: 'Step with dynamic url',
  location: {
    appID: 'test',
    path: 'testPath/{indexID}',
  },
};
```

The value of the parameter `indexID` needs to be passed to the API service when completing step 1: `completeGuideStep('testGuide', 'step1', { indexID: 'testIndex' })`

## Guides config

To use the API service, you need to know a guide ID (currently one of `websiteSearch`, `databaseSearch`, `kubernetes`, `siem`) and a step ID (for example, `add_data`, `search_experience`, `rules` etc). The consumers of guided onboarding register their guide configs themselves and have therefore full control over the guide ID and step IDs used for their guide. For more details on registering a guide config, see below.

## Server side: register a guide config

The guided onboarding exposes a function `registerGuideConfig(guideId: GuideId, guideConfig: GuideConfig)` function in its setup contract. This function allows consumers to register a guide config for a specified guide ID. The function throws an error if a config already exists for the guide ID. See code examples in following plugins:

- enterprise search: `x-pack/solutions/search/plugins/enterprise_search/server/plugin.ts`
- observability: `x-pack/solutions/observability/plugins/observability/server/plugin.ts`
- security solution: `x-pack/solutions/security/plugins/security_solution/server/plugin.ts`

## Adding a new guide

Follow these simple steps to add a new guide to the guided onboarding framework. For more detailed information about framework functionality and architecture and about API services exposed by the plugin, please read the full readme.

1.  Declare the `guidedOnboarding` plugin as an optional dependency in your plugin's `kibana.json` file. Add the guided onboarding plugin's client-side start contract to your plugin's client-side start dependencies and the guided onboarding plugin's server-side setup contract to your plugin's server-side dependencies.
2.  Define the configuration for your guide. At a high level, this includes a title, description, and list of steps. See this [example config](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-guided-onboarding/src/common/test_guide_config.ts) or consult the `GuideConfig` interface.
3.  Register your guide during your plugin's server-side setup by calling a function exposed by the guided onboarding plugin: `registerGuideConfig(guideId: GuideId, guideConfig: GuideConfig)`. For an example, see this [example plugin](https://github.com/elastic/kibana/blob/main/examples/guided_onboarding_example/server/plugin.ts).
4.  Update the cards on the landing page to include your guide in the use case selection. Make sure that the card doesn't have the property `navigateTo` because that is only used for cards that redirect to Kibana pages and don't start a guide. Also add the same value to the property `guideId` as used in the guide config. Landing page cards are configured in this [kbn-guided-onboarding package](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-guided-onboarding/src/components/landing_page/guide/guide_cards.constants.tsx).
5.  Integrate the new guide into your Kibana pages by using the guided onboarding client-side API service. Make sure your Kibana pages correctly display UI elements depending on the active guide step and the UI flow is straight forward to complete the guide. See existing guides for an example and read more about the API service in this file, the section "Client-side: API service".
6.  Optionally, update the example plugin's [form](https://github.com/elastic/kibana/blob/main/examples/guided_onboarding_example/public/components/main.tsx#L38) to be able to start your guide from that page and activate any step in your guide (useful to test your guide steps).
